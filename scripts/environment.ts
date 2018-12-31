import { platform } from 'os';
import { normalize, resolve } from 'path';

export const isCI = !!process.env.SYSTEM_COLLECTIONID; // azure
export const isWin = platform() === 'win32';
export const isMac = platform() === 'darwin';
export const isLinux = platform() === 'linux';

export const ORIGINAL_HOME = process.env.ORIGINAL_HOME || process.env.HOME;
process.env.ORIGINAL_HOME = ORIGINAL_HOME;

export const ORIGINAL_PATH = process.env.ORIGINAL_PATH || process.env.PATH;
process.env.ORIGINAL_PATH = ORIGINAL_PATH;

const buildTo = __dirname;
const sourceFrom = resolve(__dirname, '../../scripts');

export function myScriptSourcePath(path: string) {
	return resolve(buildTo, path).replace(buildTo, sourceFrom);
}

export const WORKSPACE_ROOT = resolve(myScriptSourcePath(__dirname), '..');
/**@deprecated*/ export const MY_SCRIPT_ROOT = resolve(WORKSPACE_ROOT, 'scripts/ide');
/**@deprecated*/ export const MY_SCRIPT_ROOT_BUILT = resolve(buildTo, 'ide');
export const VSCODE_ROOT = resolve(WORKSPACE_ROOT, 'kendryte-ide');
export const BUILD_ROOT = resolve(WORKSPACE_ROOT, 'build');
export const DEBUG_APP_ROOT = resolve(BUILD_ROOT, 'DebugContents');
export const DOWNLOAD_PATH = resolve(BUILD_ROOT, 'download');
export const RELEASE_ROOT = resolve(BUILD_ROOT, 'ide-main-release');
export const ARCH_RELEASE_ROOT = resolve(RELEASE_ROOT, 'kendryte-ide-release-x64');
export const FAKE_HOME = resolve(BUILD_ROOT, 'FAKE_HOME');

if (!process.env.ORIGINAL_HOME) {
	process.env.ORIGINAL_HOME = process.env.HOME;
}
export const HOME = process.env.HOME = FAKE_HOME;

export const NODEJS_INSTALL = resolve(BUILD_ROOT, 'nodejs');
export const NODEJS = isWin? 'node.ps1' : 'node';

export const YARN_FOLDER = resolve(BUILD_ROOT, 'yarn');
export const PREFIX = YARN_FOLDER;
export const YARN_CACHE_FOLDER = resolve(YARN_FOLDER, 'cache');

export const PRIVATE_BINS = resolve(BUILD_ROOT, 'wrapping-bins');

const LocalNodePath = resolve(WORKSPACE_ROOT, 'node_modules/.bin');
let sp = '';
let PATHS = [
	PRIVATE_BINS,
	LocalNodePath,
	resolve(DEBUG_APP_ROOT, 'LocalPackage/toolchain/bin'),
	resolve(DEBUG_APP_ROOT, 'LocalPackage/cmake/bin'),
];
if (platform() === 'win32') {
	sp = ';';
	PATHS.push('C:/WINDOWS/system32', 'C:/WINDOWS', 'C:/WINDOWS/System32/Wbem', 'C:/WINDOWS/System32/WindowsPowerShell/v1.0');
	if (isCI) {
		PATHS.push(resolve(BUILD_ROOT, 'python27'));
	} else {
		PATHS.push(resolve(process.env.USERPROFILE, '.windows-build-tools/python27'));
	}
} else if (platform() === 'darwin') {
	sp = ':';
	PATHS.push('/bin', '/usr/bin');
	PATHS.push('/usr/local/opt/coreutils/libexec/gnubin', '/usr/local/bin');
} else {
	sp = ':';
	PATHS.push('/bin', '/usr/bin');
}
export const PATH = process.env.PATH = PATHS.map(normalize).join(sp);
if (isCI) {
	console.error('PATH=%s', process.env.PATH);
}

if (process.env.KENDRYTE_PROXY) {
	process.env.HTTP_PROXY = process.env.KENDRYTE_PROXY;
}

if (process.env.HTTP_PROXY) {
	process.env.HTTPS_PROXY = process.env.ALL_PROXY = process.env.HTTP_PROXY;
} else {
	delete process.env.HTTP_PROXY;
	delete process.env.HTTPS_PROXY;
	delete process.env.ALL_PROXY;
}

export const TMP = resolve(BUILD_ROOT, 'tmp');
/**@deprecated*/export const TEMP = TMP;
process.env.TEMP = process.env.TMP = TMP;

process.chdir(process.env.GULP_BOOTSTRAP_CWD || process.cwd());

export const SHELL_ROOT = resolve(WORKSPACE_ROOT, 'shell');
export const SHELL_OUTPUT = resolve(DEBUG_APP_ROOT, 'Updater/resources/app');

export const BUILD_DIST_SOURCE = resolve(BUILD_ROOT, 'shell-build/source');
export const BUILD_ASAR_DIR = resolve(BUILD_ROOT, 'shell-build/asar');
export const BUILD_DIST_TARGETS = resolve(BUILD_ROOT, 'shell-build/platform-dists');
export const BUILD_ARTIFACTS_DIR = resolve(BUILD_ROOT, 'artifact');

export const UILanguage = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
process.env.LANG = 'C';
process.env.LC_ALL = 'C';

export const ALL_PROXY = process.env.ALL_PROXY;
export const HTTP_PROXY = process.env.HTTP_PROXY;
export const HTTPS_PROXY = process.env.HTTPS_PROXY;

export const npm_config_arch = 'x64';
export const npm_config_cache = resolve(TMP, 'npm-cache');
export const npm_config_disturl = 'https://atom.io/download/electron';
export const npm_config_runtime = 'electron';
