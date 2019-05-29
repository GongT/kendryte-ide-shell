export function getVersionString() {
	return 'master';
}

export enum SdkType {
	standalone = 'standalone',
	freertos = 'freertos',
}

export enum SdkBranch {
	master = 'master',
	develop = 'develop',
}

export function isOverrideableVersion(v: string) {
	if (v === SdkBranch.develop || v === SdkBranch.master) {
		return true;
	} else {
		return false;
	}
}