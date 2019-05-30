const {execSync} = require('child_process');
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
console.log('npm_config_target=%s', electronVersion);

rimraf.sync('build');
execSync('node-gyp', [
	'rebuild',
	'--target=' + electronVersion,
	'--arch=x64',
	'--dist-url=https://atom.io/download/electron',
], {
	stdio: 'inherit',
});
