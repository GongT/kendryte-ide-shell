import { remote } from 'electron';
import { is } from 'electron-util';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { configFileName } from '../main/appdata';

const winSlash = /\\/g;

export const isBuilt = /[\/\\]resources[\/\\]app[\/\\]/.test(__dirname);
console.log(`isBuilt=${isBuilt}`);

// from src/library:                   src/app/resources/electronRoot/wrapper                src/sourceRoot/DebugContents
export const appRoot = isBuilt? resolve(__dirname, '../../../../../') : resolve(__dirname, '../../');
console.log(`appRoot=${appRoot}`);

export const contentRoot = isBuilt? appRoot : resolve(appRoot, 'DebugContents');

export const configFile = resolve(contentRoot, 'config', configFileName);
console.log(`configFile=${configFile}`);

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

export function myProfilePath(what: string) {
	return resolve(contentRoot, 'UserData/updater/user-data', what);
}

export function tempDir(what: string) {
	return nativePath(tmpdir(), 'KendryteIDE', what);
}