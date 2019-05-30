const {execSync} = require('child_process');
const rimraf = require('rimraf');
process.chdir(process.env.SYSTEM_DEFAULTWORKINGDIRECTORY);

process.chdir('node_modules/@serialport/bindings');
rimraf('build');

console.log('run gyp rebuild in %s', process.cwd());
console.log('npm_config_target=%s', process.env.npm_config_target);
execSync('node-gyp', [
	'rebuild',
	'--target=' + process.env.npm_config_target,
	'--arch=x64',
	'--dist-url=https://atom.io/download/electron',
], {
	stdio: 'inherit',
});
