import { MINode } from './mi2Parser';
import { IMyLogger } from '../baseLogger';
import { ISimpleOutput, Mi2CommandController } from './mi2CommandController';
import { Emitter, EventRegister } from '../event';
import { ProgressPromise } from '../deferredPromise';
import { outOfBandRecordMap } from './nodeWalker';
import { dumpJson } from '../library/strings';

const numRegex = /\d+/;
const interruptedRegex = /Interrupt./;

export enum ThreadNotify {
	Created,
	Exited,
	GroupAdd,
	GroupStarted,
}

export interface IThreadEvent {
	type: ThreadNotify;
	id: number;
}

export enum StopReason {
	Breakpoint,
	StepComplete,
	SignalStop,
	UnknownReason,
	UserCause,
}

export interface IRunStateEvent {
	running: boolean;
	reason: StopReason;
	allThreads: boolean;
	threadId: number;
}

/**
 * 调试器抽象层，不要依赖【任何】vscode相关的东西，尤其是debug session
 */
export class Mi2Handler {
	private controller: Mi2CommandController;

	private readonly _onTargetRunStateChange = new Emitter<IRunStateEvent>();
	public readonly onTargetRunStateChange = this._onTargetRunStateChange.event;

	private readonly _onThreadNotify = new Emitter<IThreadEvent>();
	public readonly onThreadNotify = this._onThreadNotify.event;

	public readonly onSimpleLine: EventRegister<ISimpleOutput>;

	constructor(
		input: NodeJS.ReadableStream,
		output: NodeJS.WritableStream,
		private readonly logger: IMyLogger,
	) {
		this.controller = new Mi2CommandController(output, input);

		this.onSimpleLine = this.controller.onSimpleLine;
		this.controller.onSimpleLine(({ error, message }) => {
			logger.writeln('simpleOut: ' + message);
		});
		this.controller.onReceiveMi2(({ line, parsed }) => {
			this.handleMI(line, parsed);
		});
	}

	dispose() {
		this.controller.dispose();
		this._onTargetRunStateChange.dispose();
		this._onThreadNotify.dispose();
	}

	command(command: string, ...args: string[]): ProgressPromise<MINode, MINode> {
		const ret = this.controller.send([command, ...args].join(' '));

		this.logger.info(`send command: ${ret.token} - ${command}`);

		ret.promise.then(() => {
			this.logger.info(`command return: ${command}`);
		}, (err) => {
			this.logger.error(`command error: ${command}: - ${err}`);
		});

		return ret.promise;
	}

	async commandSequence(commandsArgs: [string, ...string[]][]): Promise<MINode> {
		let ret: MINode;
		for (const [command, ...args] of commandsArgs) {
			ret = await this.command(command, ...args);
		}
		return ret;
	}

	private handleMI(line: string, parsed: MINode) {
		if (parsed.resultRecords) {
			this.logger.debug(JSON.stringify(parsed.resultRecords, null, 2));
			if (parsed.isUnhandled()) {
				this.logger.critical(`command return, but not exists: ${line}\n${JSON.stringify(parsed)}`);
			} else {
				if (parsed.resultRecords.resultClass === 'running') {
					this._onTargetRunStateChange.fire({
						running: true,
						reason: StopReason.UnknownReason,
						allThreads: parsed.record('thread-id') === 'all',
						threadId: parseInt(parsed.record('thread-id')),
					});
				} else if (parsed.resultRecords.resultClass === 'done' && parsed.request.startsWith('exec-interrupt')) {
					this._onTargetRunStateChange.fire({
						running: false,
						reason: StopReason.UserCause,
						allThreads: true,
						threadId: undefined,
					});
				}
			}
		}

		outOfBandRecordMap(parsed, true, {
			log: (record) => {
				this.logger.info(record.content.replace(/\s+$/, ''));
				return false;
			},
		});
		outOfBandRecordMap(parsed, false, {
			notify: (record) => {
				if (record.asyncClass === 'thread-created') {
					this._onThreadNotify.fire({ type: ThreadNotify.Created, id: parsed.record('id') });
					return true;
				} else if (record.asyncClass === 'thread-exited') {
					this._onThreadNotify.fire({ type: ThreadNotify.Exited, id: parsed.record('id') });
					return true;
				} else if (record.asyncClass === 'thread-group-added') {
					this._onThreadNotify.fire({ type: ThreadNotify.GroupAdd, id: parsed.record('id') });
					return true;
				} else if (record.asyncClass === 'thread-group-started') {
					this._onThreadNotify.fire({ type: ThreadNotify.GroupStarted, id: parsed.record('id') });
					return true;

				} else {
					this.logger.warning(`missing notify: ${record.asyncClass}`);
					return false;
				}
			},
			status: (record) => {
				if (parsed.isUnhandled() && record.asyncClass === 'download') {
					this.logger.writeln('download: ' + record.output.map(([k, v]) => `${k}=${v}`).join(', '));
				}
				return true;
			},
			exec: (record) => {
				const event: IRunStateEvent = {
					allThreads: true, // parsed.record('stopped-threads') === 'all',
					threadId: undefined, // parsed.record('thread-id'),
				} as IRunStateEvent;
				if (record.asyncClass === 'stopped') {
					event.running = false;
					const reason = parsed.record('reason');
					if (reason === undefined) {
						event.reason = StopReason.UnknownReason;
					} else if (reason === 'breakpoint-hit') {
						event.reason = StopReason.Breakpoint;
					} else if (reason === 'end-stepping-range') {
						event.reason = StopReason.StepComplete;
					} else if (reason === 'function-finished') {
						event.reason = StopReason.StepComplete;
					} else if (reason === 'signal-received') {
						event.reason = StopReason.SignalStop;
					} else if (reason === 'exited-normally') {
						setImmediate(() => {this.dispose();});
					} else if (reason === 'exited') { // never run this?
						this.logger.error('Program exited with code ' + parsed.record('exit-code'));
						setImmediate(() => {this.dispose();});
					} else {
						this.logger.error('Not implemented stop reason (assuming exception): ' + reason);
						return false;
					}
				} else if (record.asyncClass === 'running') {
					event.running = true;
					event.reason = StopReason.UnknownReason;
				} else {
					return false;
				}
				this.logger.warning(`exec event dump: ${dumpJson(parsed)}`);

				this.logger.writeln(`exec change: ${record.asyncClass}: ${StopReason[event.reason]}`);
				this._onTargetRunStateChange.fire(event);
				return true;
			},
		});
		if (parsed.isUnhandled()) {
			this.logger.error('Unhandled line: ' + line + '\n-----------\n' + JSON.stringify(parsed, null, 2) + '\n-----------');
		}
	}

	cliCommand(expression: string, threadId: number = 0, frameLevel: number = 0) {
		const params = [];
		if (threadId !== 0) {
			params.push('--thread', threadId, '--frame', frameLevel);
		}
		return this.command('interpreter-exec', 'console', JSON.stringify(expression), ...params);
	}
}