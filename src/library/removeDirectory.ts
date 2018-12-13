import rimraf = require('rimraf');
import { rmdir as rmdirAsync, unlink as unlinkAsync } from 'fs';
import { pathExists } from 'fs-extra';
import { isAbsolute, normalize } from 'path';
import { logger } from './logger';
import { registerWork } from './work';

export async function removeDirectory(path: string) {
	path = normalize(path);
	logger.log(`removing directory: ${path}...\n`);
	if (!isAbsolute(path)) {
		throw new Error('removeDirectory not absolute.');
	}
	if (process.cwd().indexOf(path) === 0) {
		logger.debug(`  Cwd: ${process.cwd()}\n`);
		throw new Error('No way to remove current directory.');
	}
	
	if (!await pathExists(path)) {
		logger.debug(`never exists...\n`);
		return;
	}
	
	logger.progress(Infinity);
	await new Promise<void>((resolve, reject) => {
		const wrappedCallback = (err: Error) => err? reject(err) : resolve();
		
		rimraf(path, {
			maxBusyTries: 20,
			emfileWait: true,
			disableGlob: true,
			unlink: wrapFs(unlinkAsync) as typeof unlinkAsync,
			rmdir: wrapFs(rmdirAsync) as typeof rmdirAsync,
		}, wrappedCallback);
	});
	
	logger.progress(NaN);
}

function wrapFs(of: Function): Function {
	return ((...args: any[]) => {
		logger.sub(`${of.name}: ${args[0]}`);
		return of.apply(undefined, args);
	}) as any;
}

export function willRemove(path: string) {
	logger.debug(`will remove directory: ${path}`);
	registerWork(() => {
		return removeDirectory(path);
	});
}
