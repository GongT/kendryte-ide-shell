import { readFileSync } from 'fs';
import { platform } from 'os';
import { resolve } from 'path';
import { getProductData } from './library/misc/fsUtil';

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
export const BUILD_IDE_ROOT = BUILD_ROOT + 'build/ide';

export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
export const AWS_REGION = process.env.AWS_REGION;
export const AWS_BUCKET = process.env.AWS_BUCKET;

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
		try {
			return getProductData().quality;
		} catch (e) {
			console.error('Please checkout submodule `kendryte-ide`.\nOr set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)');
			process.exit(1);
		}
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

export const isWin = platform() === 'win32';

export const UILanguage = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
process.env.LANG = 'C';
process.env.LC_ALL = 'C';

export const VSCODE_ROOT = resolve(BUILD_ROOT_ABSOLUTE, 'kendryte-ide');
export const RELEASE_ROOT = resolve(BUILD_ROOT_ABSOLUTE, BUILD_IDE_ROOT);
export const ARCH_RELEASE_ROOT = resolve(BUILD_ROOT_ABSOLUTE, BUILD_IDE_ROOT, `kendryte-ide-${platform()}-x64`);

export const isMac = platform() === 'darwin';

export function nativePath(p: string) {
	return p.replace(/^\/cygdrive\/([a-z])/i, (m0, drv) => {
		return drv.toUpperCase() + ':';
	});
}

export function requireEnvPath(name: string): string {
	if (!process.env[name]) {
		throw new Error('Env ' + name + ' not set');
	}
	return nativePath(process.env[name]);
}

export const AWS_RELEASE_UPDATER_PATH = `release/updater/`;
export const AWS_RELEASE_PACKAGES_PATH = `3rd-party/offline/`;
export const AWS_RELEASE_PACKAGES_REGISTRY = `3rd-party/offline/index-creation-file.json`;

export const OBJKEY_IDE_JSON = 'release/IDE.' + getProductData().quality + '.json';
export const OBJKEY_DOWNLOAD_INDEX = 'index.html';
export const OBJKEY_PACKAGE_MANAGER_LIBRARY = 'package-manager/registry/library.json';
export const OBJKEY_PACKAGE_MANAGER_EXAMPLE = 'package-manager/registry/example.json';

