import { is } from 'electron-util';

export const SYS_NAME = ideUrlPropName();

export interface IDEJson {
	version: string;
	updaterVersion: string;
	offlinePackageVersion: string;
	homepageUrl: string;
	patches: IDEPatchJson[];
	
	linux: string;
	mac: string;
	windows: string;
}

export type UrlKey = 'linux'|'mac'|'windows';

export interface IDEPatchJson {
	linux: {generic: string};
	mac: {generic: string};
	version: string;
	windows: {generic: string};
}

function ideUrlPropName(): UrlKey {
	if (is.windows) {
		return 'windows';
	} else if (is.macos) {
		return 'mac';
	} else {
		return 'linux';
	}
}

export function latestPatch(state: IDEJson): null|IDEPatchJson {
	state.patches.sort((a, b) => {
		return parseFloat(b.version) - parseFloat(a.version);
	});
	
	return state.patches[0];
}