import { ChildProcess, SpawnOptions } from 'child_process';
import { isWin } from '../../environment';
import { StatusCodeError } from './error';

export type ProcessArgsInfo = [string, ReadonlyArray<string>];

export function parseCommand(cmd: string, args: ReadonlyArray<string>): [string, string[]] {
	if (!args) {
		args = [];
	}
	if (cmd === 'powershell.exe') {
		return [cmd, args.slice()];
	}
	if (isWin) {
		args = args.map((arg) => {
			if (/\s/.test(arg)) {
				return JSON.stringify(arg);
			}
			return arg;
		});
		return ['C:/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe', ['-Command', cmd, ...args]];
	} else {
		return [cmd, args.slice()];
	}
}

export function processPromise(cp: ChildProcess, cmd: ProcessArgsInfo, options?: SpawnOptions) {
	const stack = new Error('save stack');
	return new Promise<void>((resolve, reject) => {
		const cwd = (options && options.cwd)? options.cwd : process.cwd();
		cp.once('error', reject);
		cp.once('exit', (code: number, signal: string) => {
			const e = StatusCodeError(code, signal, [cmd[0], cmd[1], cwd]);
			if (e) {
				e.stack = e.message + '\n' + stack.stack.split('\n').slice(1).join('\n');
				reject(e);
			} else {
				resolve();
			}
		});
	});
}