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

export function latestPatch(state: IDEJson): null | IDEPatchJson {
}