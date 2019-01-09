const {platform} = require('os');
const {resolve} = require('path');
const {execSync} = require('child_process');

const platformName = platform();
const builtName = platformName === 'darwin'? platformName : platformName + '-x64';

const distFile = `latest-${process.env.CHANNEL}-${platformName}.7z`;
const distFolder = process.env.BUILD_ARTIFACTSTAGINGDIRECTORY || process.env.TMP;

process.env.LANG = 'C';
process.env.LC_ALL = 'C';

const makeResult = resolve(process.cwd(), `../VSCode-${builtName}`);

const cmd = `7za a -y -r -mmt -ms=on -mx3 -ssc "${distFolder}/${distFile}" .`;
console.log('Command To Run:', cmd);
console.log('Working Dir:', makeResult);
execSync(cmd, {
	cwd: makeResult,
	stdio: 'inherit',
});
