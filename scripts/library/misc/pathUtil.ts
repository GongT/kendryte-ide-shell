import { mkdirpSync } from 'fs-extra';
import { isAbsolute, join, normalize, resolve } from 'path';
import { resolve as _resolve } from 'url';
import { isWin, RELEASE_ROOT } from '../../environment';

export function chdir(d: string) {
	d = normalize(d);
	if (process.cwd() !== d) {
		console.log('\r\x1BK > %s', d);
		process.chdir(d);
	}
}

export function ensureChdir(p: string) {
	p = normalize(p);
	mkdirpSync(p);
	return chdir(p);
}

export function yarnPackageDir(what: string) {
	return resolve(RELEASE_ROOT, 'yarn-dir', what);
}

export interface PathJoiner {
	(p: string, ...paths: string[]): string;
}

export const resolvePath: PathJoiner = resolveRelative;
export const resolveUrl: PathJoiner = _resolve;
export const nativePath: PathJoiner = resolveRelative;

const absolute = /^\/|^[a-z]:\\\//i;

function resolveRelative(p: string, ...paths: string[]): string {
	if (isAbsolute(p[0])) {
		return resolve(p, ...paths);
	} else {
		return resolve('/', p, ...paths).replace(absolute, '');
	}
}

export function posixPath(p: string, ...paths: string[]) {
	return isWin? normalize(resolveRelative(p, ...paths)).replace(/\\/g, '/') : resolveRelative(p, ...paths);
}

export function posixJoin(p: string, ...paths: string[]) {
	return isWin? normalize(join(p, ...paths)).replace(/\\/g, '/') : join(p, ...paths);
}

export function requireEnvPath(name: string): string {
	if (!process.env[name]) {
		throw new Error('Env ' + name + ' not set');
	}
	return nativePath(process.env[name]);
}
