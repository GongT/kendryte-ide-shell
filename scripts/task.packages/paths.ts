import { join, resolve } from 'path';
import { BUILD_DIST_ROOT, BUILD_ROOT_ABSOLUTE } from '../environment';

export function saveName(name: string, platform: string, version: string) {
	return `${platform}.${name}.${version}.7z`;
}

export function savePath(name: string, platform: string, version: string) {
	return resolve(BUILD_ROOT_ABSOLUTE, BUILD_DIST_ROOT, 'download', saveName(platform, name, version));
}

export const packagesExtractPath = join(BUILD_DIST_ROOT, 'offline-package-temp') + '/';
