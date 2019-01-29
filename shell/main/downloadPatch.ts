import { rename } from 'fs-extra';
import { basename } from 'path';
import { alwaysPromise } from '../library/alwaysPromise';
import { ecopy } from '../library/electronCopy';
import { nativePath, resourceLocation } from '../library/environment';
import { logger } from '../library/logger';
import { removeDirectory } from '../library/removeDirectory';
import { registerWork, workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadPatch(template: string, target: string, urls: string[]) {
	const targetTemp = nativePath(target, '..', '.PATCHING');
	workTitle('Cloning', basename(template));
	registerWork('clone old app', () => noAsar(async () => {
		logger.debug('clone: ' + template + ' -> ' + targetTemp);
		await removeDirectory(targetTemp);
		await ecopy(template, targetTemp);
	}));
	urls.forEach((url) => {
		downloadAndExtract(url, nativePath(targetTemp, resourceLocation), 'Updates');
	});
	
	registerWork('rename temp', () => noAsar(async () => {
		await removeDirectory(target);
		logger.debug('rename ' + targetTemp + ' -> ' + target);
		await rename(targetTemp, target);
	}));
}

function noAsar<T>(action: () => Promise<T>): Promise<T> {
	process.noAsar = true;
	return alwaysPromise(action(), () => {
		process.noAsar = false;
	}, true);
}
