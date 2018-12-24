import { remote } from 'electron';
import { is } from 'electron-util';
import { readdir, unlink } from 'fs-extra';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { configFileName } from '../main/appdata';

const winSlash = /\\/g;

export const isBuilt = /[\/\\]resources[\/\\]app(?:\.asar)?[\/\\]/i.test(__dirname);
console.log(`isBuilt=${isBuilt} (%s)`, __dirname);

// from src/library:                   app/resources/electronRoot/wrapper                src/sourceRoot/DebugContents
export const appRoot = isBuilt? resolve(__dirname, '../../../../') : resolve(__dirname, '../..');
console.log(`appRoot=${appRoot}`);

export const contentRoot = isBuilt? appRoot : resolve(appRoot, 'DebugContents');
console.log(`contentRoot=${contentRoot}`);

export const configFile = resolve(contentRoot, configFileName);
console.log(`configFile=${configFile}`);

export const resourceLocation = is.macos? 'Contents/Resources/app' : 'resources/app';

export const SELF_VERSION = require(isBuilt? resolve(__dirname, '../package.json') : resolve(__dirname, '../../package.json')).releaseDate;

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
