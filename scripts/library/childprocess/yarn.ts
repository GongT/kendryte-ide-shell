import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { PassThrough } from 'stream';
import { log } from '../gulp';
import { chdir } from '../misc/pathUtil';
import { pipeCommandOut } from './complex';

export interface IInstallOpt {
	args?: string[]
}

export async function installDependency(dir?: string, opts: IInstallOpt = {}): Promise<void> {
	if (dir && process.cwd() !== dir) {
		chdir(dir);
	}
	
	const tee = new PassThrough();
	tee.pipe(createWriteStream('yarn-install.log'));
	
	const extra = [];
	if (opts.args) {
		extra.push(...opts.args);
	}
	await yarn(log, 'install', ...extra);
}

export async function yarn(cmd: string, ...args: string[]) {
	if (existsSync('yarn-error.log')) {
		unlinkSync('yarn-error.log');
	}
	log(`Pwd: ${process.cwd()}\nCommand: yarn ${cmd}\nLogfile: ${resolve(process.cwd(), 'yarn-install.log')}`);
	await pipeCommandOut(process.stderr, 'yarn', cmd, ...args);
	log(`yarn ${cmd} success.`);
	if (existsSync('yarn-error.log')) {
		log('yarn-error.log is exists!');
		log('Failed: yarn install failed, see yarn-install.log And yarn-error.log\n');
		throw new Error(`yarn install failed, please see ${resolve(process.cwd(), 'yarn-error.log')}`);
	}
	log(`yarn ${cmd} success again.`);
}
