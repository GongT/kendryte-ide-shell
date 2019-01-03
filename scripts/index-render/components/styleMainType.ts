import { getReleaseChannel } from '../../library/releaseInfo/qualityChannel';

export function styleMainType() {
	switch (getReleaseChannel()) {
	case 'alpha':
		return 'warning';
	case 'beta':
		return 'success';
	case 'stable':
		return 'primary';
	default:
		return 'default';
	}
}
