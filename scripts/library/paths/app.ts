import { IPlatformTypes } from '../gulp';

export function platformResourceAppDir(platform: IPlatformTypes) {
	if (platform === 'darwin') {
		return 'Contents/Resources/app';
	} else {
		return 'resources/app';
	}
}
