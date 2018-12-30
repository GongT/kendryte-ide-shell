import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { PassThrough } from 'stream';
import { log } from '../gulp';
import { useWriteFileStream } from '../misc/myBuildSystem';
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
	await yarn('install', ...extra);
}

export async function yarn(cmd: string, ...args: string[]) {
	if (existsSync('yarn-error.log')) {
		unlinkSync('yarn-error.log');
	}
	
	log(`Pwd: ${process.cwd()}\nCommand: yarn ${cmd}\nLogfile: ${resolve(process.cwd(), 'yarn-install.log')}`);
	const logTarget = process.env.SYSTEM_COLLECTIONID? process.stderr : useWriteFileStream('logs/yarn-install.log');
	await pipeCommandOut(logTarget, 'yarn', cmd, '--verbose', ...args).catch((e) => {
		showError(cmd, 'yarn-install.log');
		throw e;
	});
	log(`yarn ${cmd} success.`);
	if (existsSync('yarn-error.log')) {
		showError(cmd, 'yarn-error.log');
		throw new Error(`yarn install failed, please see ${resolve(process.cwd(), 'yarn-error.log')}`);
	}
	log(`yarn ${cmd} success again.`);
}

function showError(cmd: string, logF: string) {
	log('yarn %s failed. check log file yarn-install.log and yarn-error.log, find them at %s', cmd, process.cwd());
}
