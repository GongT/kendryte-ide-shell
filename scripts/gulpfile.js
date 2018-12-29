process.env.GULP_BOOTSTRAP_CWD = require('path').resolve(__dirname, '..');
process.chdir(process.env.GULP_BOOTSTRAP_CWD);

console.log('\x1B[38;5;14mrun `tsc -p scripts/tsconfig.json` in %s\x1B[0m', process.cwd());
const r = require('child_process').spawnSync(__dirname + '/node_modules/.bin/tsc', ['-p', 'scripts/tsconfig.json'], {
	stdio: 'inherit',
});
console.log('ok.');
const hasError = r.error || r.status || r.signal;
if (r.error) {
	throw r.error;
}
if (r.status) {
	process.exit(r.status);
	return;
}
if (r.signal) {
	process.kill(process.pid, r.signal);
	return;
}
const outDir = require('path').resolve(__dirname, require(__dirname + '/tsconfig.json').compilerOptions.outDir);
const gulpfile = require('path').resolve(outDir, 'main-gulpfile');
console.log('\x1B[38;5;14musing gulpfile: %s\x1B[0m', gulpfile);
require(gulpfile);
