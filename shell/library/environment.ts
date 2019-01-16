import { remote } from 'electron';
import { is } from 'electron-util';
import { readdir, unlink } from 'fs-extra';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { configFileName } from '../main/appdata';

console.log(`__dirname=${__dirname}`);

const winSlash = /\\/g;

const packageJson = resolve(__dirname, '../package.json');
console.log(`packageJson=${packageJson}`);

export const SELF_VERSION: string = '' + require(packageJson).releaseTag;
console.log(`SELF_VERSION=${SELF_VERSION}`);

export const appExt = is.macos? '.app' : '';

export const isBuilt = SELF_VERSION !== 'sourcecode';
console.log(`isBuilt=${isBuilt}`);

export const appRoot = resolve(__dirname, '../../../../', isBuilt && is.macos? '..' : '.');
console.log(`appRoot=${appRoot}`);

export const contentRoot = appRoot;
console.log(`contentRoot=${contentRoot}`);

export const configFile = resolve(contentRoot, configFileName);
console.log(`configFile=${configFile}`);

export const resourceLocation = is.macos? 'Contents/Resources/app' : 'resources/app';

export function myArgs() {
	const args = [...remote.process.argv];
	args.shift(); // argv0
	if (!isBuilt) {
		args.shift(); // app path (.)
	}
	return args;
}

export interface ResolvePathFunction {
	(...pathSegments: string[]): string;
}

export function nativePath(...pathSegments: string[]) {
	return resolve(...pathSegments);
}

export const posixPath: ResolvePathFunction = is.windows? resolveWindowsPath : resolve;

function resolveWindowsPath(...pathSegments: string[]): string {
	return resolve(...pathSegments).replace(winSlash, '/');
}

export function applicationPath(what: string) {
	return resolve(contentRoot, 'Application', what);
}

export function userDataPath(version: string) {
	return resolve(contentRoot, 'UserData', version);
}

export function localPackagePath(what: string) {
	return resolve(contentRoot, 'LocalPackage', what);
}

export function systemTempPath() {
	return resolve(contentRoot, 'PortableSystemTemp');
}

export function myProfilePath(what: string) {
	return resolve(contentRoot, 'UserData/updater/user-data/', what);
}

export function tempDir(what: string) {
	return nativePath(tmpdir(), 'KendryteIDE', what);
}

const logdir = myProfilePath('logs');
readdir(logdir).then(async (files) => {
	for (const file of files) {
		if (file.startsWith('output-')) {
			const ts = Date.parse(file.replace(/^output-|$\.log/g, ''));
			if (isNaN(ts)) {
				continue;
			}
			const yesterday = new Date();
			yesterday.setHours(0);
			yesterday.setMinutes(0);
			yesterday.setSeconds(0);
			yesterday.setMilliseconds(0);
			yesterday.setDate(yesterday.getDate() - 1);
			
			if (ts < yesterday.getTime()) {
				await unlink(nativePath(logdir, file));
			}
		}
	}
}).catch((e) => {
	console.error('[Warn] cannot cleanup logs folder.');
});
