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
