import { basename } from 'path';
import { un7z } from '../library/compress';
import { downloadedFilePath, downloadFile } from '../library/downloadTask';
import { logger } from '../library/logger';
import { registerWork, workTitle } from '../library/work';

export function downloadAndExtract(from: string, target: string) {
	logger.debug(`Will download object from:\n    ${from}\n extract to:\n    ${target}`);
	const fromBase = basename(from);
	registerWork(workTitle('Downloading', from));
	registerWork(() => {
		return downloadFile(from, fromBase);
	});
	registerWork(workTitle('Installing', from));
	registerWork(() => {
		return un7z(downloadedFilePath(fromBase), target);
	});
}