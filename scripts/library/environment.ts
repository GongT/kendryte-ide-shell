import { readFileSync } from 'fs';

process.chdir(process.env.GULP_BOOTSTRAP_CWD || process.cwd());

export const BUILD_ROOT_ABSOLUTE = process.cwd();
export const BUILD_ROOT = './';

export const SHELL_ROOT = BUILD_ROOT + 'shell/';
export const SHELL_SOURCE = SHELL_ROOT + 'src/';
export const SHELL_OUTPUT = SHELL_ROOT + 'dist/';
export const BUILD_RELEASE_FILES = BUILD_ROOT + 'release-assets/';

export const BUILD_DIST_ROOT = BUILD_ROOT + 'build/';
export const BUILD_DIST_SOURCE = BUILD_DIST_ROOT + 'source/';
export const BUILD_DIST_TARGETS = BUILD_DIST_ROOT + 'release/';
export const BUILD_ARTIFACTS_DIR = BUILD_DIST_ROOT + 'artifact/';

export const ELECTRON_VERSION = parseElectronVer(BUILD_ROOT + 'scripts/package.json');

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

export function getProjectName() {
	return process.env.SYSTEM_TEAMPROJECT || 'kendryte-ide';
}

function parseElectronVer(pkgFile: string) {
	const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
	let v = '';
	if (pkg.dependencies && pkg.dependencies.electron) {
		v = pkg.dependencies.electron;
	} else if (pkg.devDependencies && pkg.devDependencies.electron) {
		v = pkg.devDependencies.electron;
	}
	if (/^\d/.test(v)) {
		return 'v' + v;
	} else {
		return 'v' + v.slice(1);
	}
}