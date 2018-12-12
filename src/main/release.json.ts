import { is } from 'electron-util';

export const SYS_NAME = ideUrlPropName();

export interface IDEJson {
	homepageUrl: string;
	linux: string;
	mac: string;
	patches: IDEPatchJson[];
	version: string;
	windows: string;
}

export interface IDEPatchJson {
	linux: { generic: string };
	mac: { generic: string };
	version: string;
	windows: { generic: string };
}

function ideUrlPropName() {
	if (is.windows) {
		return 'windows';
	} else if (is.macos) {
		return 'mac';
	} else {
		return 'linux';
	}
}

export function latestPatch(state: IDEJson): null | IDEPatchJson {
	state.patches.sort((a, b) => {
		return parseFloat(b.version) - parseFloat(a.version);
	});

	return state.patches[0];
}