import { removeDirectory } from '../ide/codeblocks/removeDir';
import { simpleCommandAt } from './childprocess/complex';
import { resolvePath } from './misc/pathUtil';

export async function fixSerialPortPackageBuild(path: string) {
	const loader = process.env.VSCODE_ROOT + '/build/lib/electron.js';
	let getElectronVersion: Function;
	try {
		getElectronVersion = require(loader).getElectronVersion;
	} catch (e) {
		console.error('Cannot require %s. check VSCODE_ROOT variable.', loader)
	}

	const version = getElectronVersion();

	const modulePath = resolvePath(path, 'node_modules/@serialport/bindings');
	console.log(' -- fix bug for serial port package (%s)', modulePath);
	console.log('Path=', process.env.Path);
	console.log('PATH=', process.env.Path);
	console.log(process.argv0);
	console.log('\n\n\n');
	await removeDirectory(resolvePath(modulePath, 'build'));
	await simpleCommandAt(modulePath,
		'node-gyp',
		'rebuild',
		'--target=' + version,
		'--arch=x64',
		'--dist-url=https://atom.io/download/electron',
	);
}
