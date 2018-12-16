import { basename } from 'path';
import { workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadMain(targetPath: string, url: string) {
	const filename = basename(targetPath);
	workTitle('Installing', filename);
	downloadAndExtract(url, targetPath, 'IDE');
}
