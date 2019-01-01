import { IPlatformMap, IPlatformTypes, log } from '../gulp';
import { ExS3 } from '../misc/awsUtil';
import { OBJKEY_IDE_JSON } from '../releaseInfo/s3Keys';
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
		cachedRemoteData = await ExS3.instance().loadJson<IDEJson>(OBJKEY_IDE_JSON);
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
	return ExS3.instance().putJson(OBJKEY_IDE_JSON, currentJson);
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
		return true;
	}
	if (r.version === local.version && r.patchVersion === local.patchVersion) {
		return false;
	}
	return true;
}
