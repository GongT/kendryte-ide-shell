const {spawnSync} = require('child_process');
const {platform} = require('os');

console.log('=====================================================');
console.log(' * This is prepare-environment-on-azure.js');
console.log(Object.entries(process.env).map(([k, v]) => `${k}=${v}`).join('\n'));
console.log('=====================================================');

// this file bootstrap powershell script with npm credentials, but it need to rewrite in js...

const isCI = !!process.env.SYSTEM_COLLECTIONID;
if (!isCI) {
	console.error('this script is for azure pipelines');
	process.exit(0);
}

const pwsh = platform() === 'win32'? 'powershell.exe' : 'pwsh';

process.chdir(__dirname);
const cp = spawnSync(pwsh, [
	__filename.replace(/\.js$/, '.ps1'),
], {
	stdio: 'inherit',
	shell: false,
});
if (cp.error) {
	throw cp.error;
}
if (cp.signal) {
	console.error('process exit by signal:', cp.signal);
	process.exit(1);
}
if (cp.status !== 0) {
	process.exit(cp.status);
}
