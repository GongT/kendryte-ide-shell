import { readdir } from 'fs-extra';
import { resolve } from 'path';
import { ARCH_RELEASE_ROOT } from '../../../environment';
import { simpleCommandOut } from '../../../library/childprocess/complex';
import { installDependency } from '../../../library/childprocess/yarn';
import { log } from '../../../library/gulp';
import { isExists, rename, unlink } from '../../../library/misc/fsUtil';
import { chdir, ensureChdir } from '../../../library/misc/pathUtil';
import { timing } from '../../../library/misc/timeUtil';
import { showElectronNoticeInChina } from '../getElectron';
import { gulpCommands } from '../gulp';
import { removeDirectory } from '../removeDir';

export async function cleanupBuildResult(dir: string) {
	const backupDir = dir.replace(/(.app)$|$/, '.last$1');
	log(`build target is: ${dir}`);
	if (await isExists(dir)) {
		if (await isExists(backupDir)) {
			await removeDirectory(backupDir);
		}
		log(`remove last build result.`);
		
		await rename(dir, backupDir).catch((e) => {
			log.error(`Cannot rename folder "${dir}", did you open any file in it?`);
			throw e;
		});
	}
}

export async function yarnInstall() {
	const timeInstall = timing();
	
	const integrityFile = resolve(ARCH_RELEASE_ROOT, 'node_modules/.yarn-integrity');
	if (await isExists(integrityFile)) {
		await unlink(integrityFile);
	}
	await installDependency(ARCH_RELEASE_ROOT);
	log('dependencies installed.' + timeInstall());
}

export async function downloadElectron() {
	chdir(ARCH_RELEASE_ROOT);
	log(`installing electron...`);
	showElectronNoticeInChina();
	
	await simpleCommandOut('node', ...gulpCommands(), 'electron-x64');
	log('electron installed.');
}

export async function downloadBuiltinExtensions() {
	chdir(ARCH_RELEASE_ROOT);
	log(`installing builtin extension...\n`);
	await simpleCommandOut('node', 'build/lib/builtInExtensions.js');
	log('builtin extension installed.');
}

export async function deleteCompileCaches() {
	ensureChdir(process.env.TEMP);
	for (const folder of await readdir(process.env.TMP)) {
		if (folder.startsWith('v8-compile-cache')) {
			await removeDirectory(resolve(process.env.TMP, folder));
		}
	}
	await removeDirectory(resolve(process.env.TMP, 'npm-cache'));
	
	chdir(process.env.HOME);
	await removeDirectory(resolve(process.env.HOME, '.node-gyp'));
	for (const folder of await readdir(process.env.HOME)) {
		if (folder.startsWith('.v8flags')) {
			await removeDirectory(resolve(process.env.TMP, folder));
		}
	}
}
