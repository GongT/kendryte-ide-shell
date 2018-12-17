import { is } from 'electron-util';
import { writeFile } from 'fs-extra';
import { myProfilePath } from '../library/environment';

const ShellExportCommand = is.windows? process.env.comspec : '/bin/sh';

/**
 * create a script to show what happens, but not run it
 */
export class DebugScript {
	private readonly prepend: string;
	private cmd: string[] = [];
	
	constructor(cwd: string, env: any) {
		let dbg = `cd "${cwd}"\n`;
		for (const k of Object.keys(env)) {
			dbg += ShellExportCommand + ' ' + k + '=' + env[k] + '\n';
		}
		this.prepend = dbg;
	}
	
	command(name: string, args: string[]) {
		args = args.map((item) => {
			if (/\s/.test(item)) {
				return JSON.stringify(item);
			}
			return item;
		});
		this.cmd.push(`"${name}" ${args.join(' ')}`);
	}
	
	writeBack(file: string) {
		return writeFile(myProfilePath('logs/' + is.windows? file + '.bat' : file + '.sh'), this.toString(), 'utf8');
	}
	
	toString() {
		return this.prepend + this.cmd.join('\n');
	}
}
