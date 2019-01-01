import { basename } from 'path';
import { runSfx, un7z } from '../library/compress';
import { downloadedFilePath, downloadFile } from '../library/downloadTask';
import { logger } from '../library/logger';
import { registerWork, workTitle } from '../library/work';

export function downloadAndExtract(from: string, target: string, what?: string) {
	if (what) {
		what = what + ': ';
	} else {
		what = '';
	}
	logger.debug(`Will download object from:\n    ${from}\n extract to:\n    ${target}`);
	const fromBase = basename(from);
	workTitle('Downloading', what + from);
	registerWork('download extract - ' + (what || from), () => {
		return downloadFile(from, fromBase);
	});
	workTitle('Installing', what + target);
	registerWork('install - ' + (what || target), () => {
		const zipFile = downloadedFilePath(fromBase);
		if (/\.7z$/i.test(zipFile)) {
			return un7z(zipFile, target);
		} else {
			return runSfx(zipFile, target);
		}
	});
}
