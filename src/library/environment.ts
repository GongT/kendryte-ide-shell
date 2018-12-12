import { resolve } from 'path';
import { is } from 'electron-util';
import { configFileName } from '../main/appdata';

const winSlash = /\\/g;

export const isBuilt = /[\/\\]resources[\/\\]app[\/\\]/.test(__dirname);
console.log(`isBuilt=${isBuilt}`);
export const appRoot = isBuilt? resolve(__dirname, '../../../../../') : resolve(__dirname, '../../');
console.log(`appRoot=${appRoot}`);
export const configFile = resolve(appRoot, 'config', configFileName);
console.log(`configFile=${configFile}`);

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
	return resolve(appRoot, 'Application', what);
}

export function logPath(what: string) {
	return resolve(appRoot, 'logs', what);
}
