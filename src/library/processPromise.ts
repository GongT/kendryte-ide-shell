import { ChildProcess } from 'child_process';

export function processPromise(cp: ChildProcess, cmd: string[], cwd: string) {
	return new Promise<void>((resolve, reject) => {
		cp.once('error', reject);
		cp.once('exit', (code: number, signal: string) => {
			const e = StatusCodeError(code, signal, cwd, cmd);
			if (e) {
				reject(e);
			} else {
				resolve();
			}
		});
	});
}

export interface ProgramError extends Error {
	__cwd: string;
	__program: string;
	__programError: boolean;
	signal: string;
	status: number;
}

function indentArgs(args: ReadonlyArray<string>) {
	return args.map((arg, index) => {
		return `  Argument[${index}] = ${arg}`;
	}).join('\n');
}

function StatusCodeError(status: number, signal: string, cwd: string, cmd: string[]): ProgramError {
	if (status === 0 && !signal) {
		return null;
	}
	const __program = `\`${cmd.join(' ')}\`
    Command = ${cmd[0]}
${indentArgs(cmd.slice(1))}
`;
	return Object.assign(new Error(
		signal? `Program exit by signal "${signal}"` : `Program exit with code "${status}"`,
	), {
		status, signal,
		__programError: true,
		__program,
		__cwd: cmd[2],
	});
}
