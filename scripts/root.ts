export const BUILD_ROOT = process.cwd() + '/';
export const BUILD_OUTPUT = BUILD_ROOT + 'dist/';
export const BUILD_RELEASE_FILES = BUILD_ROOT + 'release-assets/';

export const BUILD_DIST_ROOT = BUILD_ROOT + 'build/';
export const BUILD_DIST_SOURCE = BUILD_ROOT + 'build/source/';
export const BUILD_DIST_TARGETS = BUILD_ROOT + 'build/release/';

export const ELECTRON_VERSION = 'v3.0.11';

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
		console.error('Please set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)');
		process.exit(1);
	}
	return channel;
}
