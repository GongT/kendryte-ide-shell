import { DeepReadonly } from 'deep-freeze';
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

let cachedOriginalData: DeepReadonly<IDEJson>;
let cachedRemotePromise: Promise<IDEJson>;

export function loadRemoteState(original: true): Promise<DeepReadonly<IDEJson>>;
export function loadRemoteState(original?: false): Promise<IDEJson>;
export function loadRemoteState(original: boolean = false): Promise<DeepReadonly<IDEJson>|IDEJson> {
	if (!cachedRemotePromise) {
		cachedRemotePromise = ExS3.instance().loadJson<IDEJson>(getIDEJsonObjectKey()).then((data) => {
			console.log('-----------------------------\n%s\n-----------------------------', JSON.stringify(data, null, 4));
			cachedOriginalData = deepFreeze(deepExtend({}, data));
			return data;
		});
	}
	return cachedRemotePromise.then((remoteData) => {
		if (original) {
			return cachedOriginalData;
		}
		return remoteData;
	});
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
		log('checkRemoteOutdated: platform `%s` version is %s, remote is %s, result is outdated', platform, local.version, r.version);
		return true;
	}
	if (r.patchVersion !== local.patchVersion) {
		log('checkRemoteOutdated: platform `%s` patch is %s, remote is %s, result is outdated', platform, local.patchVersion, r.patchVersion);
		return true;
	}
	log('checkRemoteOutdated: platform `%s` has same version (%s) and patch (%s), result is up-to-date', platform, r.version, r.patchVersion);
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
		log('checkRemoteNeedPatch: platform `%s` big version has changed (%s update-to %s), NO patch need.', platform, r.version, local.version);
		return false;
	}
	if (r.patchVersion === local.patchVersion) {
		log('checkRemoteNeedPatch: platform `%s` has exact same patch version (both %s), NO patch need', platform, r.patchVersion);
		return false;
	}
	log('checkRemoteNeedPatch: platform `%s` patch is %s, remote is %s, patch need!', platform, local.patchVersion, r.patchVersion);
	return false;
}
