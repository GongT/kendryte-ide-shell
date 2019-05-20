import { removeDirectory } from '../ide/codeblocks/removeDir';
import { simpleCommandAt } from './childprocess/complex';
import { resolvePath } from './misc/pathUtil';

export async function fixSerialPortPackageBuild(path: string) {
	console.log(' -- fix bug for serial port package');
	const modulePath = resolvePath(path, 'node_modules/@serialport/bindings');
	await removeDirectory(resolvePath(modulePath, 'build'));
	await simpleCommandAt(modulePath,
		'node-gyp',
		'rebuild',
		'--target=$npm_config_target',
		'--arch=x64',
		'--dist-url=https://atom.io/download/electron',
	);
}