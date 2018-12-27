import { normalize, resolve } from 'path';
import { BUILD_DIST_ROOT, BUILD_ROOT_ABSOLUTE, nativePath, RELEASE_ROOT } from '../../environment';
import { mkdirpSync } from './fsUtil';

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

export function sourcePath(path: string) {
	return nativePath(path).replace(resolve(BUILD_ROOT_ABSOLUTE, BUILD_DIST_ROOT, 'gulp'), resolve(BUILD_ROOT_ABSOLUTE, 'scripts'));
}
