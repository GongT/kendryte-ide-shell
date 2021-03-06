import { existsSync, readdirSync, unlinkSync } from 'fs';
import { normalize, resolve } from 'path';
import {
	ALL_PROXY,
	ARCH_RELEASE_ROOT,
	FAKE_HOME,
	HOME,
	HTTP_PROXY,
	HTTPS_PROXY,
	isWin,
	NODEJS,
	NODEJS_INSTALL,
	npm_config_arch,
	npm_config_cache,
	npm_config_disturl,
	npm_config_runtime,
	ORIGINAL_HOME,
	ORIGINAL_PATH,
	PATH,
	PREFIX,
	PRIVATE_BINS,
	RELEASE_ROOT,
	TMP,
	VSCODE_ROOT,
	WORKSPACE_ROOT,
	YARN_CACHE_FOLDER,
	YARN_FOLDER,
} from '../environment';
import { shellExec } from '../library/childprocess/simple';
import { lstat, readFile, writeFile } from '../library/misc/fsUtil';
import { resolveGitDir } from '../library/misc/git';
import { helpStringCache } from '../library/misc/help';
import { runMain } from '../library/misc/myBuildSystem';
import { chdir, resolvePath } from '../library/misc/pathUtil';

console.log(' > postinstall');

const installedMark = '## kendryte environment hook ## Do Not Edit This File';
const installedMarkEnd = '## kendryte environment hook end ## Do Not Edit This File';
const passingSimpleEnvironments = [
	['HTTP_PROXY', HTTP_PROXY],
	['HTTPS_PROXY', HTTPS_PROXY],
	['ALL_PROXY', ALL_PROXY],
	['npm_config_arch', npm_config_arch],
	['npm_config_disturl', npm_config_disturl],
	['npm_config_runtime', npm_config_runtime],
	['ORIGINAL_HOME', ORIGINAL_HOME],
	['ORIGINAL_PATH', ORIGINAL_PATH],
].map(exportSimpleEnvironment);
const passingPathEnvironments = [
	['VSCODE_ROOT', VSCODE_ROOT],
	['RELEASE_ROOT', RELEASE_ROOT],
	['ARCH_RELEASE_ROOT', ARCH_RELEASE_ROOT],
	['FAKE_HOME', FAKE_HOME],
	['HOME', HOME],
	['NODEJS_INSTALL', NODEJS_INSTALL],
	['NODEJS', NODEJS],
	['YARN_FOLDER', YARN_FOLDER],
	['PREFIX', PREFIX],
	['YARN_CACHE_FOLDER', YARN_CACHE_FOLDER],
	['PRIVATE_BINS', PRIVATE_BINS],
	['TMP', TMP],
	['TEMP', TMP],
	['npm_config_cache', npm_config_cache],
].map(isWin? exportCrossPlatformEnvironment : exportSimpleEnvironment);
let passingPath: string[];
if (isWin) {
	const mergingPath = process.env.Path;
	passingPath = [
		'unset path',
		'unset Path',
		'export PATH=' + JSON.stringify(parsePathVariable(mergingPath) + ':$PATH'),
	];
} else {
	passingPath = [exportSimpleEnvironment(['PATH', PATH])];
}
runMain(async () => {
	const gitDir = await resolveGitDir(resolve(WORKSPACE_ROOT, '.git'));
	const hooksDir = resolve(gitDir, 'hooks');
	const ls = await lstat(hooksDir);
	if (!ls || !ls.isDirectory()) {
		throw new Error('git hooks dir does not exists: ' + hooksDir + '\n   run `node node_modules/husky/bin/install.js` first.\n');
	}
	for (const item of readdirSync(hooksDir)) {
		await parseHookItem(resolve(hooksDir, item));
	}
	
	const cacheFile = helpStringCache();
	if (existsSync(cacheFile)) {
		unlinkSync(cacheFile);
	}
	
	chdir(resolvePath(WORKSPACE_ROOT, 'extensions.kendryte'));
	await shellExec('yarn');
	
	console.log(' > postinstall COMPLETE');
});

async function parseHookItem(file: string) {
	if (file.endsWith('.sample')) {
		return;
	}
	
	const data = await readFile(file);
	const lines = data.split('\n');
	
	const startMark = lines.indexOf(installedMark);
	const endMark = lines.lastIndexOf(installedMarkEnd);
	
	let start = 1, length = 0;
	if (startMark !== -1 && endMark > startMark) {
		start = startMark;
		length = endMark - startMark + 1;
	}
	
	lines.splice(start, length,
		installedMark,
		...passingSimpleEnvironments,
		...passingPathEnvironments,
		...passingPath,
		installedMarkEnd,
	);
	
	await writeFile(file, lines.join('\n'));
}

function exportSimpleEnvironment([envName, envValue]: [string, string]) {
	return `export ${envName}=${JSON.stringify(envValue)}`;
}

function exportCrossPlatformEnvironment([envName, envValue]: [string, string]) {
	const paths = parsePathVariable(envValue);
	
	return `export ${envName}=${JSON.stringify(paths)}`;
}

function parsePathVariable(value: string) {
	return value.split(';').filter(e => e.length > 0).map((path) => {
		path = normalize(path);
		path = path.replace(/^([a-z]):\\/i, (m0, drive) => {
			return '/' + drive.toLowerCase() + '/';
		});
		path = path.replace(/\\/g, '/');
		return path;
	}).join(':');
}
