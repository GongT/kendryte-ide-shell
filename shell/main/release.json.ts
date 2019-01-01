import { platform as oplatform } from 'os';
import { logger } from '../library/logger';
import { loadJson } from '../library/network';
import { IRegistryData, loadApplicationData } from './appdata';

export interface IPlatformMap<T> {
	win32: T;
	linux: T;
	darwin: T;
}

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

export function latestPatch(state: IIdeJsonInner): null|IDEPatchJson {
	if (state.patches.length > 0) {
		return state.patches[state.patches.length - 1];
	} else {
		return null;
	}
}

export const platforms: IPlatformTypes[] = ['win32', 'darwin', 'linux'];
export type IPlatformTypes = keyof IPlatformMap<any>;

export const platform: IPlatformTypes = oplatform() as any;

export async function getMyRegistry() {
	return (await getFullRegistry())[platform];
}

let registry: IDEJson;

export async function getFullRegistry() {
	if (!registry) {
		const data = await loadApplicationData();
		logger.debug('Get registry:' + data.registry);
		registry = await loadJson<IRegistryData>(data.registry);
	}
	return registry;
}