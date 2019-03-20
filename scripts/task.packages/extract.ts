import { resolve } from 'path';
import { Transform } from 'stream';
import { createVinylFile, everyPlatform, filesToStream, gulp, mergeStream, pluginError } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { writeFile } from '../library/misc/fsUtil';
import { getBundledVersions } from './3rd-registry';
import { cleanupTask } from './cleanup';
import { downloadTask } from './download';
import { createPackagesExtractPath, savePath } from './paths';

class ExtractStream extends Transform {
	constructor() {
		super({objectMode: true});
	}
	
	_transform({zipFile, extraTo}: {zipFile: string; extraTo: string;}, _: any, callback: Function) {
		(async () => {
			await extract7z(zipFile, extraTo);
			await writeFile(resolve(extraTo, '.install-ok'), 'install-ok:offline');
		})().then(() => {
			callback();
		}, (e) => {
			this.emit('error', pluginError('extract', e));
			callback();
		});
	}
}

export const extractPackages = everyPlatform('offpack:extract', [cleanupTask, downloadTask], (platform) => {
	const bundledVersions = getBundledVersions(platform);
	const handle = new ExtractStream();
	
	for (const [name, version] of Object.entries(bundledVersions)) {
		const extraTo = createPackagesExtractPath(platform, name);
		const zipFile = savePath(name, platform, version);
		handle.write({zipFile, extraTo});
	}
	handle.end();
	
	const bundleRoot = createPackagesExtractPath(platform, '.');
	return mergeStream(
		handle,
		filesToStream(createVinylFile('bundled-versions.json', '.', JSON.stringify(bundledVersions)))
			.pipe(gulp.dest(bundleRoot)),
	);
});
