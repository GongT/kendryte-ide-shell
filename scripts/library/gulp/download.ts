import { existsSync } from 'fs';
import { createWriteStream, pathExists, rename } from 'fs-extra';
import { basename, dirname } from 'path';
import * as request from 'request';
import * as File from 'vinyl';
import { download, gulp, log } from '../gulp';
import { simpleTransformStream } from './transform';

export function createDownload2Stream(url: string, saveTo: string) {
	if (existsSync(saveTo)) {
		log('Exists: %s', saveTo);
		return gulp.src(saveTo, {base: basename(saveTo)});
	} else {
		log.info('Downloading: %s', url);
		const tmp = saveTo + '.tmp';
		return download({
			url,
			file: basename(tmp),
		}).pipe(gulp.dest(dirname(tmp)))
		  .pipe(simpleTransformStream(async function renameDownloadedTemp(file: File) {
			  log('Downloaded: %s', tmp);
			  await rename(tmp, saveTo);
			  return file;
		  }));
	}
}

export async function createRequestDownPromise(url: string, saveTo: string) {
	if (await pathExists(saveTo)) {
		log('Exists: %s', saveTo);
		return;
	}
	const tmp = saveTo + '.tmp';
	log('Downloading: %s', url);
	await new Promise((resolve, reject) => {
		request(url)
			.on('error', reject)
			.pipe(createWriteStream(tmp))
			.on('error', reject)
			.on('finish', () => resolve());
	});
	log('Downloaded: %s', tmp);
	
	await rename(tmp, saveTo);
}
