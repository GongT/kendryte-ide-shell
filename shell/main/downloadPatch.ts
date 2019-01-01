import { copy } from 'fs-extra';
import { basename } from 'path';
import { logger } from '../library/logger';
import { registerWork, workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadPatch(template: string, target: string, urls: string[]) {
	workTitle('Cloning', basename(template));
	registerWork(async () => {
		logger.debug('clone: ' + template + ' -> ' + target);
		process.noAsar = true;
		await copy(template, target, {
			dereference: false,
			overwrite: true,
			preserveTimestamps: false,
			recursive: true,
		});
		process.noAsar = false;
	});
	urls.forEach((url) => {
		downloadAndExtract(url, target, 'Updates');
	});
}
