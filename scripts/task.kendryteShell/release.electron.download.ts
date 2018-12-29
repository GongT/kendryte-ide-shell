import { existsSync, renameSync } from 'fs';
import { mkdirpSync } from 'fs-extra';
import { basename, join } from 'path';
import { DOWNLOAD_PATH, isCI } from '../environment';
import { download, everyPlatform, gulp, log } from '../library/gulp';
import { resolvePath } from '../library/misc/pathUtil';
import { UPDATER_ELECTRON_VERSION } from '../library/releaseInfo/electronVersion';

function buildElectronUrl(platform: string) {
	if (isCI) {
		return `https://github.com/electron/electron/releases/download/${UPDATER_ELECTRON_VERSION}/electron-${UPDATER_ELECTRON_VERSION}-${platform}-x64.zip`;
	} else {
		const v = UPDATER_ELECTRON_VERSION.replace(/^v/, '');
		return `https://npm.taobao.org/mirrors/electron/${v}/electron-${UPDATER_ELECTRON_VERSION}-${platform}-x64.zip`;
	}
}

function whereToSave(url: string) {
	return join(DOWNLOAD_PATH, basename(url));
}

export function getElectronZipPath(platform: string) {
	return whereToSave(buildElectronUrl(platform));
}

export const downloadTask = everyPlatform('electron:download', (platform) => {
	const url = buildElectronUrl(platform);
	const saveTo = whereToSave(url);
	if (!existsSync(saveTo)) {
		log.info('download electron from %s to %s', url, saveTo);
		log('');
		return download(url)
			.pipe(gulp.dest(DOWNLOAD_PATH + '.tmp'))
			.on('end', () => {
				const temp = resolvePath(DOWNLOAD_PATH + '.tmp', basename(saveTo));
				mkdirpSync(DOWNLOAD_PATH);
				renameSync(temp, saveTo);
			});
	} else {
		log.info('electron exists: %s', saveTo);
	}
	return null;
});
