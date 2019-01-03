import { getReleaseChannel } from './qualityChannel';

export const AWS_RELEASE_UPDATER_PATH = `release/updater/`;
export const AWS_RELEASE_PACKAGES_PATH = `3rd-party/offline/`;
export const AWS_RELEASE_PACKAGES_REGISTRY = `3rd-party/offline/index-creation-file.json`;

export function getIDEJsonObjectKey(channel: string = getReleaseChannel()) {
	return 'release/IDE.' + channel + '.json';
}

export function getIndexPageObjectKey(channel = getReleaseChannel()) {
	return channel === 'beta'? 'index.html' : channel + '.html';
}

export const OBJKEY_PACKAGE_MANAGER_LIBRARY = 'package-manager/registry/library.json';
export const OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH = 'package-manager/library';
export const OBJKEY_PACKAGE_MANAGER_EXAMPLE = 'package-manager/registry/example.json';
export const OBJKEY_PACKAGE_MANAGER_EXAMPLE_PATH = 'package-manager/example';
export const OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH = 'package-manager/useruploads';

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_REGION = process.env.AWS_REGION;
export const AWS_BUCKET = process.env.AWS_BUCKET;
