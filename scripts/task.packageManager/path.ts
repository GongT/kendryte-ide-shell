import { join } from 'path';
import { PackageTypes } from '../library/jsonDefine/packageRegistry';
import { OBJKEY_PACKAGE_MANAGER_EXAMPLE_PATH, OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH } from '../library/releaseInfo/s3Keys';

export function createKeyBase(type: PackageTypes, name: string) {
	const typeBase = type === PackageTypes.Library? OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH : OBJKEY_PACKAGE_MANAGER_EXAMPLE_PATH;
	return join(typeBase, name);
}

export function createKeyName(version: string, prefix?: string) {
	if (prefix) {
		return prefix + '-' + version + '.zip';
	} else {
		return version + '.zip'
	}
}
