import { existsSync } from 'fs';
import { basename, join } from 'path';
import { BUILD_DIST_ROOT } from '../environment';
import { download, everyPlatform, gulp, log } from '../library/gulp';
import { resolvePath } from '../library/misc/pathUtil';
import { UPDATER_ELECTRON_VERSION } from '../library/releaseInfo/electronVersion';

function buildElectronUrl(platform: string) {
	const v = UPDATER_ELECTRON_VERSION.replace(/^v/, '');
	return `https://npm.taobao.org/mirrors/electron/${v}/electron-${UPDATER_ELECTRON_VERSION}-${platform}-x64.zip`;
}

function whereToSave(url: string) {
	return join(BUILD_DIST_ROOT, 'download', basename(url));
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
			.pipe(gulp.dest(resolvePath(BUILD_DIST_ROOT, 'download')));
	} else {
		log.info('electron exists: %s', saveTo);
	}
	return null;
});
