import { MINode, parseMI } from './mi2Parser';
import { DeferredPromise, ProgressPromise } from '../deferredPromise';
import { autoIncrease } from '../guid';
import { Emitter } from '../event';
import { outOfBandRecordMap, outOfBandRecords } from './nodeWalker';
import split2 = require('split2');

interface IHandlerData<NT = any> extends IHandlerPublicData<NT> {
	deferred: DeferredPromise<MINode, NT>;
	token: number;
	command: string;
}

export interface ISimpleOutput {
	error: boolean;
	message: string;
}

export interface IHandlerPublicData<NT = any> {
	promise: ProgressPromise<MINode, NT>;
	token: number;
	command: string;
}

const isMi2Output = /^(?:\d*|undefined)[*+=]|[~@&^]/;
const gdbMatch = /^(?:\d*|undefined)\(gdb\)$/;

/**
 * Mi2协议层
 * 接近原始MI2协议，输入指令字符串，运行，然后返回MI2结构体
 * 无自动应答操作
 */
export class Mi2CommandController {
	private readonly handlers = new Map<number, IHandlerData>();
	private readonly currentToken = autoIncrease();
	private readonly waitingInterrupt: DeferredPromise<true>[] = [];

	private readonly _onSimpleLine = new Emitter<ISimpleOutput>();
	public readonly onSimpleLine = this._onSimpleLine.event;

	private readonly _onReceiveMi2 = new Emitter<{ line: string; parsed: MINode; }>();
	public readonly onReceiveMi2 = this._onReceiveMi2.event;

	constructor(
		private readonly input: NodeJS.WritableStream,
		private readonly output: NodeJS.ReadableStream,
	) {
		output.pipe(split2()).on('data', (line) => {
			this.parseLine(line);
		});
	}

	dispose() {
		this._onSimpleLine.dispose();
		this._onReceiveMi2.dispose();
	}

	private parseLine(line: string) {
		if (isMi2Output.exec(line)) {
			const parsed = parseMI(line);
			this.recv(line, parsed);
			this._onReceiveMi2.fire({ line, parsed });
		} else if (gdbMatch.test(line.trim())) {
			return;
		} else {
			this._onSimpleLine.fire({
				error: false,
				message: line,
			});
		}
	}

	private recv<NT>(line: string, parsed: MINode) {
		this.handleNoneCommand(parsed);

		const item = parsed.token ? this.handlers.get(parsed.token) : null;
		if (!item) {
			return;
		}

		parsed.request = item.command;

		parsed.handled = false;
		for (const record of outOfBandRecords(parsed, { inStream: false, type: 'status' })) {
			if (record.asyncClass === 'download') {
				item.deferred.notify(parsed);
				parsed.handled = true;
			}
		}

		if (parsed.resultRecords) {
			if (item) {
				if (parsed.resultRecords.resultClass === 'error') {
					const msg = parsed.result('msg');
					item.deferred.error(new Error(msg));
				} else {
					item.deferred.complete(parsed);
				}
				parsed.handled = true;
			}
		}
	}

	send(command: string): IHandlerPublicData<MINode> {
		const token = this.currentToken.next();
		const deferred = new DeferredPromise<MINode, MINode>();

		const ret: IHandlerData<MINode> = {
			token,
			deferred,
			promise: deferred.p,
			command: command,
		};

		deferred.p.finally(() => {
			this.handlers.delete(token);
		});

		setImmediate(() => {
			this.input.write(`${token}-${command}\n`);
		});

		this.handlers.set(token, ret);
		return ret;
	}

	private handleNoneCommand(parsed: MINode) {
		outOfBandRecordMap(parsed, true, {
			log: (record) => {
				this._onSimpleLine.fire({
					error: false,
					message: record.content.replace(/\s+$/, ''),
				});
				return true;
			},
			console: (record) => {
				this._onSimpleLine.fire({
					error: true,
					message: record.content.replace(/\s+$/, ''),
				});
				return true;
			},
		});
	}
}