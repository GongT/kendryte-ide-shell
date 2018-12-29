import { BUILD_ROOT, DOWNLOAD_PATH } from '../environment';
import { resolvePath } from '../library/misc/pathUtil';

export function saveName(name: string, platform: string, version: string) {
	return `${platform}.${name}.${version}.7z`;
}

export function savePath(name: string, platform: string, version: string) {
	return resolvePath(DOWNLOAD_PATH, saveName(platform, name, version));
}

export function createPackagesExtractPath(platform: string, packageName: string) {
	return resolvePath(BUILD_ROOT, 'offline-package-temp', platform, 'KendryteIDE/LocalPackage', packageName);
	
}

export function getPackagesExtractRoot(platform: string) {
	return resolvePath(BUILD_ROOT, 'offline-package-temp', platform);
}
