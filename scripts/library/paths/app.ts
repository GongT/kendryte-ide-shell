import { IPlatformTypes } from '../gulp';

export function platformResourceAppDir(platform: IPlatformTypes) {
	if (platform === 'darwin') {
		return 'Resources/app';
	} else {
		return 'resources/app';
	}
}
