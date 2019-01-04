import { IPlatformMap, IPlatformTypes, log } from '../gulp';
import { ExS3 } from '../misc/awsUtil';
import { getIDEJsonObjectKey } from '../releaseInfo/s3Keys';
import { IPackageJson } from './package.json';
import deepExtend = require('deep-extend');
import deepFreeze = require('deep-freeze');

export interface IDEPatchJson {
	version: string;
	download: string;
}

export interface IIdeJsonInner {
	version: string;
	downloadUrl: string;
	patchVersion: string;
	patches: IDEPatchJson[];
}

export interface IDEJson extends IPlatformMap<IIdeJsonInner> {
	offlinePackageVersion: string;
	homepageUrl: string;
	updaterVersion: string;
}

let cachedRemoteData: IDEJson;
let cachedOriginalData: IDEJson;

export async function loadRemoteState(original: boolean = false): Promise<IDEJson> {
	if (!cachedRemoteData) {
		cachedRemoteData = await ExS3.instance().loadJson<IDEJson>(getIDEJsonObjectKey());
		cachedOriginalData = deepExtend({}, cachedRemoteData);
		deepFreeze(cachedOriginalData);
	}
	if (original) {
		return cachedOriginalData;
	}
	return cachedRemoteData;
}

export async function saveRemoteState() {
	const currentJson = await loadRemoteState();
	log('---------------- IDE.json ----------------\n%s\n---------------- IDE.json ----------------', JSON.stringify(currentJson, null, 4));
	return ExS3.instance().putJson(getIDEJsonObjectKey(), currentJson);
}

export async function ensureVersionMain(platform: IPlatformTypes, packageData: IPackageJson, url: string) {
	const data = (await loadRemoteState(true))[platform];
	const register = await loadRemoteState();
	
	if (!data || data.version !== packageData.version) {
		register[platform] = {
			version: packageData.version,
			patchVersion: packageData.patchVersion,
			downloadUrl: url,
			patches: [],
		};
	}
	
	register[platform].downloadUrl = url;
	register[platform].patchVersion = packageData.patchVersion;
}

export async function ensureVersionPatch(platform: IPlatformTypes, packageData: IPackageJson, url: string) {
	const data = (await loadRemoteState(true))[platform];
	
	if (!data || data.version !== packageData.version) {
		return false;
	}
	
	const register = await loadRemoteState();
	
	register[platform].patchVersion = packageData.patchVersion;
	
	const patches = register[platform].patches;
	if (patches.length > 0 && patches[patches.length - 1].version === packageData.patchVersion) {
		patches[patches.length - 1].download = url;
	} else {
		patches.push({
			version: packageData.patchVersion,
			download: url,
		});
	}
	return true;
}

export async function checkRemoteOutdated(platform: IPlatformTypes, local: IPackageJson) {
	const remote = await loadRemoteState(true);
	const r = remote[platform];
	if (!r) {
		log('checkRemoteOutdated: remote do not have platform `%s`, result is outdated', platform);
		return true;
	}
	if (r.version !== local.version) {
		log('checkRemoteOutdated: platform `%s` version is %s, remote is %s, result is outdated', local.version, r.version, platform);
		return true;
	}
	if (r.patchVersion === local.patchVersion) {
		log('checkRemoteOutdated: platform `%s` patch is %s, remote is %s, result is outdated', local.patchVersion, r.patchVersion, platform);
		return true;
	}
	log('checkRemoteOutdated: platform `%s` has same version and patch, result is up-to-date', platform);
	return false;
}

export async function checkRemoteNeedPatch(platform: IPlatformTypes, local: IPackageJson) {
	const remote = await loadRemoteState(true);
	const r = remote[platform];
	if (!r) {
		log('checkRemoteNeedPatch: remote do not have platform `%s`, NO patch need.', platform);
		return false;
	}
	if (r.version !== local.version) {
		log('checkRemoteNeedPatch: remote do not have platform `%s`, NO patch need.', platform);
		log('checkRemoteNeedPatch: platform `%s` big version has changed, NO patch need.', platform);
		return false;
	}
	if (r.patchVersion === local.patchVersion) {
		log('checkRemoteNeedPatch: platform `%s` has same patch, NO patch need', platform);
		return false;
	}
	log('checkRemoteNeedPatch: platform `%s` patch is %s, remote is %s, patch need!', local.patchVersion, r.patchVersion, platform);
	return false;
}
