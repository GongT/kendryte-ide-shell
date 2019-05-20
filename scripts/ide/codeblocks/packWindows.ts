import { readFileSync, rename, writeFileSync } from 'fs';
import { copy, mkdir } from 'fs-extra';
import { resolve } from 'path';
import { MY_SCRIPT_ROOT, VSCODE_ROOT } from '../../environment';
import { simpleCommandOut } from '../../library/childprocess/complex';
import { installDependency, yarn } from '../../library/childprocess/yarn';
import { fixSerialPortPackageBuild } from '../../library/fixSerialPortPackageBuild';
import { log } from '../../library/gulp';
import { isExists, writeFile } from '../../library/misc/fsUtil';
import { resolveGitDir } from '../../library/misc/git';
import { chdir, ensureChdir, yarnPackageDir } from '../../library/misc/pathUtil';
import { timing } from '../../library/misc/timeUtil';
import { gulpCommands } from './gulp';
import { removeDirectory } from './removeDir';

export async function packWindows() {
	const devDepsDir = yarnPackageDir('devDependencies');
	const prodDepsDir = yarnPackageDir('dependencies');
	
	chdir(VSCODE_ROOT);
	const root = process.cwd();
	log('  sourceRoot = ' + root);
	log('  packageRoot = ' + yarnPackageDir('.'));
	
	const gitDir = await resolveGitDir(resolve(root, '.git'));
	const originalPkg = require(resolve(root, 'package.json'));
	const originalLock = readFileSync(resolve(root, 'yarn.lock'));
	
	//// dependencies
	log('  create dependencies');
	ensureChdir(prodDepsDir);
	writeFileSync('package.json', JSON.stringify({
		license: originalPkg.license || 'MIT',
		dependencies: {
			...originalPkg.dependencies,
		},
	}));
	writeFileSync('yarn.lock', originalLock);
	
	const bothDependencies = ['applicationinsights', 'source-map-support'];
	bothDependencies.forEach((item) => {
		originalPkg.devDependencies[item] = originalPkg.dependencies[item];
	});
	
	/// dependencies - install
	const timeOutProd = timing();
	await installDependency(prodDepsDir);
	log('production dependencies installed.' + timeOutProd());
	await fixSerialPortPackageBuild(prodDepsDir);
	
	//// devDependencies
	log('  create devDependencies');
	ensureChdir(devDepsDir);
	writeFileSync('package.json', JSON.stringify({
		license: originalPkg.license || 'MIT',
		dependencies: {
			...originalPkg.devDependencies,
		},
	}));
	writeFileSync('yarn.lock', originalLock);
	log('basic files write complete.');
	
	//// devDependencies - husky
	if (!await isExists('.git')) {
		await simpleCommandOut('git', 'init', '.');
		await writeFile('.gitignore', '*');
		log('dummy git repo created.');
	}
	const huskyHooks = resolve(devDepsDir, '.git', 'hooks');
	await removeDirectory(huskyHooks);
	await mkdir(huskyHooks);
	
	/// devDependencies - install
	const timeOutDev = timing();
	await installDependency(devDepsDir);
	log('development dependencies installed.' + timeOutDev());
	
	//// devDependencies - husky (ensure)
	await simpleCommandOut('node', 'node_modules/husky/bin/install.js');
	
	/// devDependencies - link to working tree
	const devDepsStore = resolve(devDepsDir, 'node_modules');
	log(`create link from ${devDepsStore} to ${root}`);
	const lnk = require('lnk');
	await lnk([devDepsStore], root);
	
	/// ASAR
	log('create ASAR package');
	chdir(root);
	const timeOutZip = timing();
	await simpleCommandOut('node', ...gulpCommands(), '--gulpfile', resolve(MY_SCRIPT_ROOT, 'gulpfile/pack-win.js'));
	log('ASAR created.' + timeOutZip());
	
	log('move ASAR package to source root');
	chdir(root);
	await new Promise((_resolve, reject) => {
		const wrappedCallback = (err: Error) => err? reject(err) : _resolve();
		rename(
			resolve(prodDepsDir, 'node_modules.asar.unpacked'),
			resolve(root, 'node_modules.asar.unpacked'),
			wrappedCallback);
	});
	await new Promise((_resolve, reject) => {
		const wrappedCallback = (err: Error) => err? reject(err) : _resolve();
		rename(
			resolve(prodDepsDir, 'node_modules.asar'),
			resolve(root, 'node_modules.asar'),
			wrappedCallback);
	});
	log('ASAR moved to root.');
	
	/// install child node_modules by default script
	log('run post-install script');
	chdir(root);
	const timeOutPostInstall = timing();
	await yarn('postinstall');
	log('Yarn postinsall success.' + timeOutPostInstall());
	
	await copy(huskyHooks, resolve(gitDir, 'hooks'));
	
	log('Everything complete.');
}
