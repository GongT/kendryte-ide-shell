import { basename, join } from 'path';
import { DOWNLOAD_PATH, isCI } from '../environment';
import { everyPlatform } from '../library/gulp';
import { createDownload2Stream } from '../library/gulp/download';
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
	return createDownload2Stream(url, saveTo);
});
