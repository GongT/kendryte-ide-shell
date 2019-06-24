import { VSCODE_ROOT } from '../../environment';

export function getElectronVersion() {
	const loader = VSCODE_ROOT + '/build/lib/electron.js';
	try {
		const getElectronVersion: Function = require(loader).getElectronVersion;
		return getElectronVersion();
	} catch (e) {
		throw new Error('Cannot get electron version: ' + e.message);
	}
}
