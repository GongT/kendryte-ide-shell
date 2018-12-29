import { BUILD_DIST_ROOT, BUILD_ROOT } from '../environment';
import { resolvePath } from '../library/misc/pathUtil';

export function saveName(name: string, platform: string, version: string) {
	return `${platform}.${name}.${version}.7z`;
}

export function savePath(name: string, platform: string, version: string) {
	return resolvePath(BUILD_ROOT, BUILD_DIST_ROOT, 'download', saveName(platform, name, version));
}

export const packagesExtractPath = resolvePath(BUILD_DIST_ROOT, 'offline-package-temp') + '/';
