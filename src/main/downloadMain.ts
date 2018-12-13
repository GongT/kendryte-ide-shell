import { basename } from 'path';
import { registerWork, workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadMain(targetPath: string, url: string) {
	const filename = basename(targetPath);
	registerWork(workTitle('Installing', filename));
	downloadAndExtract(url, filename);
}
