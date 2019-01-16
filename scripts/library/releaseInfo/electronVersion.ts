import { readFileSync } from 'fs';
import { WORKSPACE_ROOT } from '../../environment';
import { resolvePath } from '../misc/pathUtil';

export const UPDATER_ELECTRON_VERSION = parseElectronVer(resolvePath(WORKSPACE_ROOT, 'shell/package.json'));

export function parseElectronVer(pkgFile: string) {
	const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
	let v = '';
	if (pkg.dependencies && pkg.dependencies.electron) {
		v = pkg.dependencies.electron;
	} else if (pkg.devDependencies && pkg.devDependencies.electron) {
		v = pkg.devDependencies.electron;
	} else {
		throw new Error('Cannot detect electron version.');
	}
	if (/^\d/.test(v)) {
		return 'v' + v;
	} else {
		return 'v' + v.slice(1);
	}
}
