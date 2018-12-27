import { existsSync } from 'fs';
import { basename, join } from 'path';
import { BUILD_DIST_ROOT, ELECTRON_VERSION, } from '../environment';
import { download, everyPlatform, gulp, log } from '../library/gulp';

function buildElectronUrl(platform: string) {
	const v = ELECTRON_VERSION.replace(/^v/, '');
	return `https://npm.taobao.org/mirrors/electron/${v}/electron-${ELECTRON_VERSION}-${platform}-x64.zip`;
}

function whereToSave(url: string) {
	return join(BUILD_DIST_ROOT + 'download', basename(url));
}

export function getElectronZipPath(platform: string) {
	return whereToSave(buildElectronUrl(platform));
}

export const downloadTask = everyPlatform('electron:download', (platform) => {
	const url = buildElectronUrl(platform);
	const saveTo = whereToSave(url);
	if (!existsSync(saveTo)) {
		log.info('download electron from %s to %s', url, saveTo);
		return download(url)
			.pipe(gulp.dest(BUILD_DIST_ROOT + 'download'));
	} else {
		log.info('electron exists: %s', saveTo);
	}
	return null;
});
