import { copy, move } from 'fs-extra';
import { platform } from 'os';
import { dirname, resolve } from 'path';
import { RELEASE_ROOT } from '../../environment';
import { getOutputCommand, pipeCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { IDEJson, SYS_NAME } from '../../library/jsonDefine/releaseRegistry';
import { calcCompileRootFolderName, getPackageData, mkdirpSync } from '../../library/misc/fsUtil';
import { chdir, ensureChdir } from '../../library/misc/pathUtil';
import { createTempPath, downloadFile } from '../codeblocks/downloadFile';
import { removeDirectory } from '../codeblocks/removeDir';
import { releaseZipStorageFolder, un7zip } from '../codeblocks/zip';
import { releaseFileName, TYPE_ZIP_FILE } from '../codeblocks/zip.name';

const patchingDir = resolve(RELEASE_ROOT, 'create-patch');
const {compress} = require('targz');

async function extractVersion(zip: string, type: string) {
	const temp = resolve(patchingDir, type + '-unzip');
	const result = resolve(patchingDir, type);
	
	await removeDirectory(temp);
	await removeDirectory(result);
	
	log('extract ' + zip);
	await un7zip(zip, temp);
	log('extract complete.');
	
	const ideDirName = calcCompileRootFolderName();
	log(`move ${ideDirName}/resources/app`);
	await move(resolve(temp, ideDirName, 'resources/app'), result);
	log('ok.');
	
	ensureChdir(process.env.TEMP);
	await removeDirectory(temp);
	
	return result;
}

async function downloadAndExtractOldVersion(remote: IDEJson) {
	const oldZipUrl = remote[SYS_NAME];
	if (!oldZipUrl) {
		throw new Error('There is no previous version download url for ' + SYS_NAME + '. That is impossible');
	}
	const cacheFileName = createTempPath(oldZipUrl);
	
	await removeDirectory(patchingDir);
	mkdirpSync(patchingDir);
	
	log('download old version.');
	await downloadFile(oldZipUrl, cacheFileName);
	log('downloaded old version.');
	
	return await extractVersion(cacheFileName, 'old-version');
}

async function createDiffWithGit(remote: IDEJson) {
	const oldVersion = await downloadAndExtractOldVersion(remote);
	
	const compileResult = resolve(releaseZipStorageFolder(), releaseFileName(platform(), TYPE_ZIP_FILE));
	const newVersion = await extractVersion(compileResult, 'new-version');
	
	chdir(oldVersion);
	await pipeCommandOut(process.stderr, 'git', 'init', '.');
	await pipeCommandOut(process.stderr, 'git', 'add', '.');
	await pipeCommandOut(process.stderr, 'git', 'commit', '-m', 'old version at ' + oldVersion);
	
	log('move .git folder and clean old dir');
	await move(resolve(oldVersion, '.git'), resolve(newVersion, '.git'));
	log('ok');
	
	chdir(newVersion);
	await pipeCommandOut(process.stderr, 'git', 'add', '.');
	const fileList = await getOutputCommand('git', 'diff', '--name-only', 'HEAD');
	
	log('copy changed file to dist folder');
	log(`  From: ${newVersion}`);
	log(`  To  : ${patchingDir}`);
	const lines = fileList.trim().split(/\n/g).map(e => e.trim()).filter(e => e).filter((file) => {
		if (/(?:^|\/)node_modules(?:\.asar(?:\.unpacked\/|$)?)?/.test(file)) {
			return false;
		}
		return true;
	});
	if (lines.length === 0) {
		throw new Error('Nothing changed.');
	}
	log('---------------------------');
	log(lines.join('\n'));
	log('---------------------------');
	for (const file of lines) {
		const source = resolve(newVersion, file);
		const target = resolve(patchingDir, file);
		mkdirpSync(dirname(target));
		log(`copy ${file}\n`);
		await copy(source, target).catch((e) => {
			if (e.code === 'ENOENT') { // missing file => deleted from git
				log('ignore missing file: ', e.message);
				return;
			} else {
				log('failed: ' + e.message);
				throw e;
			}
		});
	}
	log('ok.');
	
	chdir(patchingDir);
	await removeDirectory(oldVersion);
	await removeDirectory(newVersion);
	
	return patchingDir;
}

export async function createPatch(remote: IDEJson) {
	log('creating patch folder:');
	const diffFolder = await createDiffWithGit(remote);
	log('created patch folder: ' + diffFolder);
	
	const packData = await getPackageData();
	
	const patchFile = resolve(RELEASE_ROOT, 'release-files', `${packData.version}_${packData.patchVersion}_${platform()}.tar.gz`);
	chdir(diffFolder);
	const config = {
		src: './',
		dest: patchFile,
		tar: {
			dmode: 493, // 0755
			fmode: 420, // 0644
			strict: true,
		},
		gz: {
			level: 6,
			memLevel: 6,
		},
	};
	await new Promise((resolve, reject) => {
		const wrappedCallback = (err: Error) => err? reject(err) : resolve();
		compress(config, wrappedCallback);
	});
	
	return patchFile;
}
