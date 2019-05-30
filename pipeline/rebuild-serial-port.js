const {spawnSync} = require('child_process');
const rimraf = require('rimraf');

const isCI = !!process.env.SYSTEM_COLLECTIONID;
if (!isCI) {
	console.error('this script is for azure pipelines');
	process.exit(1);
}
process.chdir(process.env.SYSTEM_DEFAULTWORKINGDIRECTORY);

process.chdir('node_modules/@serialport/bindings');

console.log('run gyp rebuild in %s', process.cwd());

const electronVersion = require(process.env.SYSTEM_DEFAULTWORKINGDIRECTORY + '/build/lib/electron').getElectronVersion();
console.log('electronVersion=%s', electronVersion);
console.log('PATH=%s', process.env.Path);

rimraf.sync('build');

let cmd = 'node-gyp';
let args = [
	'rebuild',
	'--verbose',
	'--target=' + electronVersion,
	'--arch=x64',
	'--dist-url=https://atom.io/download/electron',
];
if (process.platform === 'win32') {
	args.unshift(cmd);
	cmd = 'powershell.exe';
}

/** @var SpawnSyncReturns */
const r = spawnSync(cmd, args, {stdio: 'inherit'});
if (r.error) {
	throw r.error;
}
if (r.status !== 0) {
	console.error('Exit with code %s', r.status);
	process.exit(r.status);
}
if (r.signal) {
	console.error('Exit with signal %s', r.signal);
	process.exit(1);
}

process.exit(0);
