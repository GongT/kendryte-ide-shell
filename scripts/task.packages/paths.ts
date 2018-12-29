import { BUILD_DIST_ROOT, BUILD_ROOT } from '../environment';
import { resolvePath } from '../library/misc/pathUtil';

export function saveName(name: string, platform: string, version: string) {
	return `${platform}.${name}.${version}.7z`;
}

export function savePath(name: string, platform: string, version: string) {
	return resolvePath(BUILD_ROOT, BUILD_DIST_ROOT, 'download', saveName(platform, name, version));
}

export function createPackagesExtractPath(platform: string, packageName: string) {
	return resolvePath(BUILD_DIST_ROOT, 'offline-package-temp', platform, 'KendryteIDE/LocalPackage', packageName);
	
}

export function getPackagesExtractRoot(platform: string) {
	return resolvePath(BUILD_DIST_ROOT, 'offline-package-temp', platform);
}
