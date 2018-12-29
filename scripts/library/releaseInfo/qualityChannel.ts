import { getProductData } from '../misc/fsUtil';
export function getReleaseChannel() {
	let channel = '' + process.env.CHANNEL;
	switch (channel) {
	case 'a':
	case 'alpha':
		channel = 'alpha';
		break;
	case 'b':
	case 'beta':
		channel = 'beta';
		break;
	case 's':
	case 'stable':
		channel = 'stable';
		break;
	default:
		try {
			return getProductData().quality;
		} catch (e) {
			console.error('Please checkout submodule `kendryte-ide`.\nOr set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)');
			process.exit(1);
		}
	}
	return channel;
}
