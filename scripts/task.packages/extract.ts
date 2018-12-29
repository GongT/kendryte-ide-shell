import { spawn } from 'child_process';
import { readdir, rename, rmdir } from 'fs-extra';
import { resolve } from 'path';
import { Transform } from 'stream';
import { processPromise } from '../library/childprocess/handlers';
import { createVinylFile, everyPlatform, filesToStream, gulp, log, mergeStream, pluginError } from '../library/gulp';
import { mkdirpSync, writeFile } from '../library/misc/fsUtil';
import { getBundledVersions } from './3rd-registry';
import { cleanupTask } from './cleanup';
import { downloadTask } from './download';
import { createPackagesExtractPath, getPackagesExtractRoot, savePath } from './paths';

const p7z = require('7zip-bin').path7za;

function gulpExtract7z(zip: string, saveTo: string): Promise<void> {
	const szCmd = [
		'x',
		'-y',
		zip,
	];
	log.info('Decompress: ' + zip);
	const opt = {
		cwd: saveTo,
		stdio: 'ignore',
	};
	
	mkdirpSync(saveTo);
	
	return processPromise(spawn(p7z, szCmd, opt), [p7z, szCmd], opt).then(() => {
		log.error('Decompress Success.');
	}, (e) => {
		log.error('Failed to extract ' + zip);
		throw e;
	});
}

class ExtractStream extends Transform {
	constructor() {
		super({objectMode: true});
	}
	
	_transform({zipFile, extraTo}: {zipFile: string; extraTo: string;}, _: any, callback: Function) {
		(async () => {
			await gulpExtract7z(zipFile, extraTo + '.tmp');
			const child = await readdir(extraTo + '.tmp');
			if (child.length === 1) {
				await rename(extraTo + '.tmp/' + child[0], extraTo);
				await rmdir(extraTo + '.tmp');
			} else {
				await rename(extraTo + '.tmp', extraTo);
			}
			await writeFile(resolve(extraTo, '.install-ok'), 'install-ok:offline');
		})().then(() => {
			callback();
		}, (e) => {
			callback(pluginError('extract', e));
		});
	}
}

export const extractPackages = everyPlatform('offpack:extract', [cleanupTask, downloadTask], (platform) => {
	const bundledVersions = getBundledVersions();
	const handle = new ExtractStream();
	
	for (const [name, version] of Object.entries(bundledVersions)) {
		const extraTo = createPackagesExtractPath(platform, name);
		const zipFile = savePath(name, platform, version);
		handle.write({zipFile, extraTo});
	}
	handle.end();
	
	return mergeStream(
		handle,
		filesToStream(createVinylFile('bundled-versions.json', undefined, JSON.stringify(bundledVersions)))
			.pipe(gulp.dest(getPackagesExtractRoot(platform))),
	);
});
