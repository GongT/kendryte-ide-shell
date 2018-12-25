import { existsSync } from 'fs';
import { basename, resolve } from 'path';
import { download, everyPlatform, gulp } from './gulp';
import { BUILD_DIST_ROOT, ELECTRON_VERSION, } from './root';

function buildElectronUrl(platform: string) {
	const v = ELECTRON_VERSION.replace(/^v/, '');
	return `https://npm.taobao.org/mirrors/electron/${v}/electron-${ELECTRON_VERSION}-${platform}-x64.zip`;
}

function whereToSave(url: string) {
	return resolve('./build/download', basename(url));
}

export function getElectronZipPath(platform: string) {
	return whereToSave(buildElectronUrl(platform));
}

export const downloadTask = everyPlatform('electron:download', (platform) => {
	const url = buildElectronUrl(platform);
	if (!existsSync(whereToSave(url))) {
		return download(url)
			.pipe(gulp.dest(BUILD_DIST_ROOT + 'download'));
	}
	return null;
});
