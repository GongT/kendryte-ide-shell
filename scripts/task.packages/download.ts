import { existsSync } from 'fs';
import { basename } from 'path';
import { DOWNLOAD_PATH } from '../environment';
import { download, everyPlatform, gulp, log, mergeStream } from '../library/gulp';
import { simpleTransformStream } from '../library/gulp/transform';
import { resolvePath } from '../library/misc/pathUtil';
import { walkRegistry } from './3rd-registry';
import { savePath } from './paths';
import { registryTask } from './registry';

export const downloadTask = everyPlatform('offpack:download', [registryTask], (platform) => {
	const downloads: NodeJS.ReadableStream[] = [];
	for (const task of walkRegistry(platform)) {
		const saveBase = resolvePath(DOWNLOAD_PATH);
		const zipPath = savePath(task.name, task.platform, task.version);
		if (existsSync(zipPath)) {
			log.info('Exists file: %s', zipPath);
			continue;
		}
		const stream = simpleTransformStream((file) => {
			file.basename = basename(zipPath);
			return file;
		});
		
		downloads.push(
			download(task.url).pipe(stream).pipe(gulp.dest(saveBase)),
		);
	}
	return mergeStream(...downloads);
});
