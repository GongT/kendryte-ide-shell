import { createGdbProcess, IChildProcess, waitProcess } from '../../common/createGdbProcess';
import { IRunStateEvent, IThreadEvent, Mi2Handler, StopReason, ThreadNotify } from '../../common/mi2/mi2Handler';
import { BackendLogger } from '../lib/backendLogger';
import { IMyLogger } from '../../common/baseLogger';
import { ContinuedEvent, DebugSession, StoppedEvent, TerminatedEvent, ThreadEvent } from 'vscode-debugadapter';
import { createServer, Server } from 'net';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, unlink } from 'fs';
import * as systemPath from 'path';
import { IDebugConsole, wrapDebugConsole } from '../lib/duplexDebugConsole';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MINode } from '../../common/mi2/mi2Parser';
import { IBackend } from './session.type';
import { Breakpoint, Stack, Thread, Variable } from '../../common/mi2/types';
import { BreakPointSet } from '../../common/mi2/breakPointSet';
import { AttachRequestArguments, LaunchRequestArguments, VariableObject } from '../type';
import { escapePath } from './escapePath';
import { MESSAGE_LOADING_PROGRAM } from '../../messages';
import { padPercent } from '../../common/library/strings';
import { DeferredPromise, timeout } from '../../common/deferredPromise';
import split2 = require('split2');

const numRegex = /\d+/;

export class DebuggingSession implements IBackend {
	private readonly logger: IMyLogger;
	private readonly debugConsole: IDebugConsole;
	private readonly handler: Mi2Handler;

	private awaitingInterrupt?: DeferredPromise<void>;
	private readonly processToExit: Promise<void>;
	private readonly connectReady: DeferredPromise<void>;
	private loadReady: DeferredPromise<void>;

	private readonly commandServer: Server;
	private readonly commandPath: string;

	private readonly breakpoints = new BreakPointSet();
	private readonly process: IChildProcess;
	private _isRunning: boolean = false;

	constructor(
		private readonly config: AttachRequestArguments | LaunchRequestArguments,
		private readonly session: DebugSession,
	) {
		this.logger = new BackendLogger(config.id ? 'gdb-' + config.id : 'gdb-main', session);
		this.debugConsole = wrapDebugConsole(session, this.logger);
		this.connectReady = new DeferredPromise<void>();

		/* PROCESS */
		const process = this.process = createGdbProcess({
			gdb: config.gdbpath,
			app: config.executable,
			args: config.debuggerArgs,
			env: config.env,
			logger: this.logger,
		});
		this.processToExit = waitProcess(process).catch((e) => {
			this.debugConsole.error('process return error: ' + e.toString());
			this.debugConsole.error('ignore this process.');
		}).finally(() => {
			this.debugConsole.log('debug session finished.');
			this.triggerEvent(new TerminatedEvent());
		});

		process.stderr.pipe(split2()).on('data', (line: Buffer) => {
			this.debugConsole.error(line.toString('utf8'));
		});

		/* COMMAND SERVER */
		const tempPath = systemPath.join(tmpdir(), 'kendryte-debug-sockets');
		this.commandPath = systemPath.join(tempPath, 'debug-' + Math.floor(Math.random() * 36 * 36 * 36 * 36).toString(36));

		const commandServer = createServer(c => {
			c.on('data', data => {
				const rawCmd = data.toString();
				const spaceIndex = rawCmd.indexOf(' ');
				let func = rawCmd;
				let args = [];
				if (spaceIndex != -1) {
					func = rawCmd.substr(0, spaceIndex);
					args = JSON.parse(rawCmd.substr(spaceIndex + 1));
				}
				Promise.resolve(this[func].apply(this, args)).then(data => {
					c.write(data.toString());
				});
			});
		});
		commandServer.on('error', err => {
			this.logger.error('Kendryte-Debug WARNING: Utility Command Server: Error in command socket ' + err.toString());
		});
		if (!existsSync(tempPath)) {
			mkdirSync(tempPath);
		}
		commandServer.listen();

		this.commandServer = commandServer;

		/* FINAL */
		this.handler = new Mi2Handler(process.stdout, process.stdin, this.logger);

		this.registerMi2EventHandlers();
	}

	get connected() {
		return this.connectReady.p;
	}

	get disconnected() {
		return this.processToExit.catch(() => {
		}).then(() => {
			return this;
		});
	}

	private triggerEvent(e: DebugProtocol.Event) {
		this.session.sendEvent(e);
	}

	async dispose() {
		const proc = this.process;
		if (!proc) {
			return;
		}

		this.handler.command('gdb-exit');

		const to = setTimeout(() => {
			this.logger.error('exit timeout, force kill.');
			proc.kill('SIGKILL');
		}, 4000);

		await this.disconnected;
		clearTimeout(to);

		this.handler.dispose();
		await new Promise((resolve) => {
			this.commandServer.close(() => {
				unlink(this.commandPath, (err) => {
					if (err) {
						console.error(err);
					}
					resolve();
				});
			});
		});
	}

	/* REQUESTS */
	async reload() {
		await this.interrupt(true);
		return this.load();
	}

	public async connect(load: boolean) {
		if (this.connectReady.isFired()) {
			throw new Error('Already connected');
		}

		this.debugConsole.log('[kendryte debug] debugger starting...');
		this.logger.info(`[kendryte debug] debugger starting: test log.`);

		await this.handler.commandSequence([
			['gdb-set', 'target-async', 'off'],
			['target-select', 'remote', this.config.target],
		]).then(() => {
			this.connectReady.complete();
		}, (e: Error) => {
			this.connectReady.error(e);
			throw e;
		});
		this.debugConsole.log('connected to: ' + this.config.target);

		if (load) {
			await this.load();
		}
	}

	async load() {
		this.debugConsole.log(MESSAGE_LOADING_PROGRAM);
		// await this.handler.command('exec-interrupt');
		let totalSent = 0, totalSize = NaN;
		await this.handler.command('target-download').progress((p) => {
			const section = p.record('section');
			const sectionSize = parseInt(p.record('section-size'));
			const sectionSent = parseInt(p.record('section-sent'));
			let sectionProgress = '.';
			if (!isNaN(sectionSize)) {
				if (!isNaN(sectionSent)) {
					const percent = ((100 * sectionSent / sectionSize).toFixed(0));
					sectionProgress = `: (${percent}%) ${sectionSent}/${sectionSize} ...`;
				} else {
					sectionProgress = ': size = ' + sectionSize;
				}
			}

			totalSent = parseInt(p.record('total-sent')) || totalSent;
			totalSize = parseInt(p.record('total-size')) || totalSize;

			const percent = padPercent(100 * totalSent / totalSize);

			this.debugConsole.log(`[${percent}] ${totalSent}/${totalSize}, Section "${section}" ${sectionProgress}`);
		});
		this.debugConsole.log('program loaded.');
	}

	async varAssign(name: string, rawValue: string) {
		const res = await this.handler.command('var-assign', name, rawValue);
		// this.logger.debug('request: varAssign(%s,%s)', name, rawValue, res);
		return res.result('value');
	}

	public async stop() {
		this.debugConsole.log('[kendryte debug] debugger stopping.');
		await this.dispose();
		await this.processToExit;
		this.debugConsole.log('ok.');
	}

	async changeVariable(name: string, rawValue: string) {
		await this.handler.command('gdb-set', 'var', name + '=' + rawValue);
		// this.logger.debug('request: changeVariable(%s, %s)', name, rawValue);
		return rawValue;
	}

	async examineMemory(from: number, length: number) {
		const result = await this.handler.command('data-read-memory-bytes', '0x' + from.toString(16), length.toString(10));
		// this.logger.info('request: examineMemory(%s, %s)', from, length, result);
		return result.result('memory[0].contents');
	}

	async addBreakPoint(breakpoint: Breakpoint): Promise<Breakpoint> {
		// this.logger.debug('request: addBreakPoint(%j)', breakpoint);
		if (this.breakpoints.get(breakpoint)) {
			return undefined;
		}
		let location = '';
		if (breakpoint.countCondition) {
			if (breakpoint.countCondition[0] === '>') {
				location += '-i ' + numRegex.exec(breakpoint.countCondition.substr(1))[0] + ' ';
			} else {
				const match = numRegex.exec(breakpoint.countCondition)[0];
				if (match.length != breakpoint.countCondition.length) {
					this.logger.error('Unsupported break count expression: \'' + breakpoint.countCondition + '\'. Only supports \'X\' for breaking once after X times or \'>X\' for ignoring the first X breaks');
					location += '-t ';
				} else if (parseInt(match) != 0) {
					location += '-t -i ' + parseInt(match) + ' ';
				}
			}
		}
		if (breakpoint.raw) {
			location += escapePath(breakpoint.raw);
		} else {
			location += escapePath(breakpoint.file + ':' + breakpoint.line);
		}
		const result = await this.tryAddBreakpoint(location);
		if (result.resultRecords.resultClass === 'done') {
			const bkptNum = parseInt(result.result('bkpt.number'));
			const newBrk: Breakpoint = {
				file: result.result('bkpt.file'),
				line: parseInt(result.result('bkpt.line')),
				condition: breakpoint.condition,
				bkptNum,
			};
			if (breakpoint.condition) {
				const result = await this.setBreakPointCondition(bkptNum, breakpoint.condition);
				if (result.resultRecords.resultClass === 'done') {
					this.breakpoints.add(newBrk);
					return newBrk;
				} else {
					return undefined;
				}
			} else {
				this.breakpoints.add(newBrk);
				return newBrk;
			}
		} else {
			return Promise.reject(result);
		}
	}

	private tryAddBreakpoint(brk: string) {
		return this.handler.command('break-insert', '-f', brk).then((result) => {
			this.logger.debug(JSON.stringify(result));
			return result;
		}, async (e) => {
			if (e.message.includes('Cannot execute this command while the target is running')) {
				this.logger.warning('target is running, interrupt and retry...');
				await this.interrupt(true);
				this.logger.info('interrupt success, retry now...');
				const result = await this.handler.command('break-insert', '-f', brk);
				await this.continue();
				return result;
			} else {
				throw e;
			}
		});
	}

	setBreakPointCondition(bkptNum, condition) {
		// this.logger.debug('request: setBreakPointCondition()');
		return this.handler.command('break-condition', bkptNum, condition);
	}

	removeBreakPoint(breakpoint: Breakpoint) {
		// this.logger.debug('request: removeBreakPoint(%j)', breakpoint);
		return new Promise<boolean>((resolve, reject) => {
			if (!this.breakpoints.get(breakpoint)) {
				return resolve(false);
			}
			this.handler.command('break-delete', breakpoint.bkptNum.toString()).then((result) => {
				if (result.resultRecords.resultClass === 'done') {
					this.breakpoints.remove(breakpoint);
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	}

	clearBreakPoints() {
		// this.logger.debug('request: clearBreakPoints()');
		return new Promise<boolean>((resolve, reject) => {
			this.handler.command('break-delete').then((result) => {
				if (result.resultRecords.resultClass === 'done') {
					this.breakpoints.clearAll();
					resolve(true);
				} else {
					resolve(false);
				}
			}, () => {
				resolve(false);
			});
		});
	}

	async interrupt(wait: boolean = true) {
		if (wait) {
			const p = this.waitInterrupt();
			const itRet = await this.handler.command('exec-interrupt');
			await p;

			if (this._isRunning) {
				throw new Error('request interrupt, but program not stop.');
			}
		} else {
			const info = await this.handler.command('exec-interrupt');

			if (this._isRunning) {
				throw new Error('request interrupt, but program not stop.');
			}
		}
	}

	private waitInterrupt() {
		if (!this.awaitingInterrupt) {
			this.awaitingInterrupt = new DeferredPromise();
			const [to, cancel] = timeout(5000);

			this.awaitingInterrupt.p.finally(() => {
				cancel();
				delete this.awaitingInterrupt;
			});

			to.then(() => {
				this.awaitingInterrupt.error(new Error('cannot interrupt program in 5s'));
			}).catch(() => undefined);
		}

		return this.awaitingInterrupt.p;
	}

	async continue() {
		// this.logger.debug('request: continue()');
		const info = await this.handler.command('exec-continue');
		this.logger.warning('continue return', info);
		if (!this._isRunning) {
			throw new Error('request continue, but program not run.');
		}
	}

	detach(): Promise<any> {
		const proc = this.process;
		const [to, dispose] = timeout(3000);
		to.then(() => {
			this.logger.warning('detach timeout, force kill.');
			proc.kill('SIGKILL');
		});
		this.process.on('exit', function () {
			dispose();
		});
		return Promise.race<any>([
			this.handler.command('target-detach'),
			to,
		]);
	}

	evalExpression(name: string, thread: number, frame: number) {
		// this.logger.debug('request: evalExpression(%s, %d, %d)', name, thread, frame);

		const args = [];
		if (thread != 0) {
			args.push('--thread', thread.toString(), '--frame', frame.toString());
		}
		args.push(name);

		return this.handler.command('data-evaluate-expression', ...args);
	}

	async getStack(maxLevels: number, thread: number): Promise<Stack[]> {
		// this.logger.debug('request: getStack()');

		let command = 'stack-list-frames';
		if (thread != 0) {
			command += ` --thread ${thread}`;
		}
		if (maxLevels) {
			command += ' 0 ' + maxLevels;
		}
		const result = await this.handler.command(command);
		const stack = result.result('stack');
		const ret: Stack[] = [];
		return stack.map(element => {
			const level = MINode.valueOf(element, '@frame.level');
			const addr = MINode.valueOf(element, '@frame.addr');
			const func = MINode.valueOf(element, '@frame.func');
			const filename = MINode.valueOf(element, '@frame.file');
			const file = MINode.valueOf(element, '@frame.fullname');
			let line = 0;
			const lnstr = MINode.valueOf(element, '@frame.line');
			if (lnstr) {
				line = parseInt(lnstr);
			}
			const from = parseInt(MINode.valueOf(element, '@frame.from'));
			return {
				address: addr,
				fileName: filename,
				file: file,
				function: func || from,
				level: level,
				line: line,
			};
		});
	}

	async getStackVariables(thread: number, frame: number): Promise<Variable[]> {
		// this.logger.debug('request: getStackVariables(%d, %d)', thread, frame);

		const result = await this.handler.command(`stack-list-variables --thread ${thread} --frame ${frame} --simple-values`);
		const variables = result.result('variables');
		const ret: Variable[] = [];
		for (const element of variables) {
			const key = MINode.valueOf(element, 'name');
			const value = MINode.valueOf(element, 'value');
			const type = MINode.valueOf(element, 'type');
			ret.push({
				name: key,
				valueStr: value,
				type: type,
				raw: element,
			});
		}
		return ret;
	}

	async getThreads(): Promise<Thread[]> {
		// this.logger.debug('request: getThreads()');

		const result = await this.handler.command('thread-info');
		const threads = result.result('threads');
		const ret: Thread[] = [];
		return threads.map(element => {
			const ret: Thread = {
				id: parseInt(MINode.valueOf(element, 'id')),
				targetId: MINode.valueOf(element, 'target-id'),
			};

			const name = MINode.valueOf(element, 'name');
			if (name) {
				ret.name = name;
			}

			return ret;
		});
	}

	public sendUserInput(expression: string, threadId: number, frameLevel: number): Promise<MINode> {
		if (expression.startsWith('-')) {
			return this.handler.command(expression.substr(1));
		} else {
			return this.handler.cliCommand(expression, threadId, frameLevel);
		}
	}

	async varCreate(expression: string, name: string = '-'): Promise<VariableObject> {
		const res = await this.handler.command('var-create', name, '@', JSON.stringify(expression));
		return new VariableObject(res.result(''));
	}

	async varListChildren(name: string): Promise<VariableObject[]> {
		// this.logger.debug('request: varListChildren()');
		//TODO: add `from` and `to` arguments
		const res = await this.handler.command('var-list-children', '--all-values', name);
		const children = res.result('children') || [];
		return children.map(child => new VariableObject(child[1]));
	}

	varUpdate(varObjName: string): Promise<MINode> {
		return this.handler.command('var-list-children', '--all-values', varObjName);
	}

	async next() {
		// this.logger.debug('request: next()');
		const info = await this.handler.command('exec-next');
		if (this._isRunning) {
			throw new Error('request interrupt (next), but program not stop.');
		}
	}

	async step() {
		// this.logger.debug('request: step()');
		const info = await this.handler.command('exec-step');
		if (this._isRunning) {
			throw new Error('request interrupt (step), but program not stop.');
		}
	}

	async stepOut() {
		// this.logger.debug('request: stepOut()');
		const info = await this.handler.command('exec-finish');
		if (this._isRunning) {
			throw new Error('request interrupt (stepOut), but program not stop.');
		}
	}

	/* EVENTS */
	private registerMi2EventHandlers() {
		this.handler.onSimpleLine(({ error, message }) => {
			if (error) {
				this.debugConsole._error(message);
			} else {
				this.debugConsole._log(message);
			}
		});
		this.handler.onThreadNotify(this.threadEvent.bind(this));
		this.handler.onTargetRunStateChange(this.handleStopResume.bind(this));
	}

	private handleStopResume(status: IRunStateEvent) {
		this.logger.info('run state change: %j', status);
		let typeStr = '';
		switch (status.reason) {
			case StopReason.Breakpoint:
				typeStr = 'breakpoint';
				break;
			case StopReason.StepComplete:
				typeStr = 'step';
				break;
			case StopReason.SignalStop:
				typeStr = 'user request';
				break;
			case StopReason.UserCause:
				typeStr = 'user request';
				break;
			default:
				typeStr = 'unknown';
		}
		const stateChanged = this._isRunning !== status.running;
		this._isRunning = !!status.running;

		if (status.running) {
			if (this.awaitingInterrupt) {
				this.awaitingInterrupt.error(new Error('program is not interrupt, but continue.'));
			}

			const event = new ContinuedEvent(status.threadId, status.allThreads);
			this.logger.info('ContinuedEvent: %j', event.body);
			this.triggerEvent(event);
		} else {
			if (this.awaitingInterrupt) {
				this.awaitingInterrupt.complete();
			}

			const event = new StoppedEvent(typeStr, status.threadId);
			(event as DebugProtocol.StoppedEvent).body.allThreadsStopped = status.allThreads;
			this.logger.info('StoppedEvent: %j', event.body);
			this.triggerEvent(event);
		}

		if (stateChanged) {
			this.debugConsole._error(this._isRunning ? '> continue' : '> interrupt');
		}
	}

	private threadEvent(event: IThreadEvent) {
		if (event.type === ThreadNotify.Created) {
			this.triggerEvent(new ThreadEvent('started', event.id));
		} else {
			this.triggerEvent(new ThreadEvent('exited', event.id));
		}
	}
}
