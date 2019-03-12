import { MINode, parseMI } from '../backend/mi_parse';
import { DeferredPromise } from '../lib';
import { AnyLogger, IRawLogger } from '../common/logger';
import * as vscode from 'vscode';

const nonOutput = /^(?:\d*|undefined)[*+=]|[~@&^]/;
const gdbMatch = /(?:\d*|undefined)\(gdb\)/;
const numRegex = /\d+/;
const interruptedRegex = /Interrupt./;

export class M2Handler {
	private handlers: { [index: number]: (error: Error, info?: MINode) => any } = {};
	private handlersCommands: { [index: number]: string } = {};
	private waitingInterrupt: DeferredPromise<true>;

	private output: IRawLogger;
	private error: IRawLogger;
	private test: IRawLogger;
	private commandInfo: IRawLogger;
	private commandReturn: IRawLogger;

	private currentToken: number;

	constructor(
		input: NodeJS.ReadableStream,
		private readonly _command: NodeJS.WritableStream,
		channel: vscode.OutputChannel,
	) {
		this.currentToken = 1;

		this.output = new AnyLogger(' * ', channel);
		this.error = new AnyLogger(' ! ', channel);
		this.commandInfo = new AnyLogger('>>> ', channel);
		this.commandReturn = new AnyLogger('<<< ', channel);
		this.test = new AnyLogger('???? ', channel);

		input.on('data', (line) => {
			this.parseLine(line);
		});
	}

	private parseLine(line: string): void {
		if (nonOutput.exec(line)) {
			this.handleMI(line);
		} else {
			this.output.writeln(line);
		}
	}

	command(command: string): Promise<MINode> {
		const sel = this.currentToken++;
		command = sel + '-' + command;

		return new Promise((resolve, reject) => {
			this.handlersCommands[sel] = command;
			this.handlers[sel] = (error, node) => {
				delete this.handlersCommands[sel];
				delete this.handlers[sel];
				if (error) {
					reject(node);
				} else {
					resolve(node);
				}
			};

			this.commandInfo.writeln(command);
			this._command.write(command + '\n');
		});
	}

	private handleMI(line: string) {
		const parsed: MINode = parseMI(line);

		if (parsed.resultRecords && parsed.resultRecords.resultClass == 'error') {
			this.error.writeln(parsed.result('msg') || line);
		}
		let handled = false;

		if (parsed.token !== undefined) {
			if (parsed.resultRecords) {
				this.commandReturn.writeln(`${this.handlersCommands[parsed.token]}\n    ${JSON.stringify(parsed.resultRecords.results)}`);
			}
			if (this.handlers[parsed.token]) {
				const msg = parsed.result('msg');
				if (msg) {
					this.handlers[parsed.token](new Error(msg), parsed);
				} else {
					this.handlers[parsed.token](null, parsed);
				}
				handled = true;
			}
		} else if (parsed.resultRecords) {
			this.test.writeln(`result (not command) = ${line}`);
			handled = true;
		}

		if (parsed.outOfBandRecord && parsed.outOfBandRecord.length) {
			for (const record of parsed.outOfBandRecord) {
				if (record.isStream) {
					switch (record.type) {
						case 'console':
							this.output.writeln(record.content.trim());
							handled = true;
							break;
						default:
							break;
					}
				} else {
					switch (record.type) {
						case 'notify':
							this.handleNotify(record.asyncClass, record.output);
							handled = true;
							break;
						default:
							break;
					}
				}
			}
		}
		if (!handled) {
			if (parsed.token || parsed.resultRecords) {
				this.error.writeln('Unhandled MI2 message: ' + line);
			} else {
				this.test.writeln(line + ' [:] ' + JSON.stringify(parsed));
			}
		}
	}

	private handleNotify(asyncClass: string, output: [string, any][]) {
		const oo = output.map(([name, value]) => {
			return `${name}=${JSON.stringify(value)}`;
		}).join(', ');
		this.output.writeln(`notify: ${asyncClass} [${oo}]`);
	}
}