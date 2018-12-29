import rimraf = require('rimraf');
import { pathExists } from 'fs-extra';
import { isAbsolute, normalize } from 'path';
import { log } from '../../library/gulp';
import { timeout } from '../../library/misc/timeUtil';

export async function removeDirectory(path: string) {
	path = normalize(path);
	if (!isAbsolute(path)) {
		throw new Error('removeDirectory not absolute.');
	}
	if (process.cwd().indexOf(path) === 0) {
		throw new Error('No way to remove current directory.');
	}
	
	if (!await pathExists(path)) {
		return;
	}
	log(`Removing directory: ${path}...`);
	
	await new Promise<void>((resolve, reject) => {
		const wrappedCallback = (err: Error) => {
			return err? reject(err) : resolve();
		};
		
		rimraf(path, {
			maxBusyTries: 20,
			emfileWait: true,
			disableGlob: true,
		}, wrappedCallback);
	});
	
	log('  - remove complete.');
	await timeout(1000);
}
