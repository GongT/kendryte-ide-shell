import { copy } from 'fs-extra';
import { basename } from 'path';
import { registerWork, workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadPatch(template: string, target: string, urls: string[]) {
	registerWork(workTitle('Cloning', basename(template)));
	registerWork(async () => {
		await copy(template, target);
	});
	urls.forEach((url) => {
		downloadAndExtract(url, target, 'Updates');
	});
}
