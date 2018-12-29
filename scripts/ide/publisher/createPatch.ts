import { OutputStreamControl } from '@gongt/stillalive';
import { copy, move } from 'fs-extra';
import { platform } from 'os';
import { dirname, resolve } from 'path';
import { RELEASE_ROOT } from '../../environment';
import { getOutputCommand, pipeCommandOut } from '../../library/childprocess/complex';
import { IDEJson, SYS_NAME } from '../../library/jsonDefine/releaseRegistry';
import { calcCompileRootFolderName, getPackageData, mkdirpSync } from '../../library/misc/fsUtil';
import { chdir, ensureChdir } from '../../library/misc/pathUtil';
import { createTempPath, downloadFile } from '../codeblocks/downloadFile';
import { removeDirectory } from '../codeblocks/removeDir';
import { releaseZipStorageFolder, un7zip } from '../codeblocks/zip';
import { releaseFileName, TYPE_ZIP_FILE } from '../codeblocks/zip.name';

const patchingDir = resolve(RELEASE_ROOT, 'create-patch');
const {compress} = require('targz');

async function extractVersion(output: OutputStreamControl, zip: string, type: string) {
	const temp = resolve(patchingDir, type + '-unzip');
	const result = resolve(patchingDir, type);
	
	await removeDirectory(temp);
	await removeDirectory(result);
	
	output.writeln('extract ' + zip);
	await un7zip(output, zip, temp);
	output.success('extract complete.');
	
	const ideDirName = calcCompileRootFolderName();
	output.writeln(`move ${ideDirName}/resources/app`);
	await move(resolve(temp, ideDirName, 'resources/app'), result);
	output.writeln('ok.');
	
	ensureChdir(process.env.TEMP);
	await removeDirectory(temp);
	
	return result;
}

async function downloadAndExtractOldVersion(output: OutputStreamControl, remote: IDEJson) {
	const oldZipUrl = remote[SYS_NAME];
	if (!oldZipUrl) {
		throw new Error('There is no previous version download url for ' + SYS_NAME + '. That is impossible');
	}
	const cacheFileName = createTempPath(oldZipUrl);
	
	await removeDirectory(patchingDir);
	mkdirpSync(patchingDir);
	
	output.writeln('download old version.');
	await downloadFile(output, oldZipUrl, cacheFileName);
	output.success('downloaded old version.');
	
	return await extractVersion(output, cacheFileName, 'old-version');
}

async function createDiffWithGit(output: OutputStreamControl, remote: IDEJson) {
	const oldVersion = await downloadAndExtractOldVersion(output, remote);
	
	const compileResult = resolve(releaseZipStorageFolder(), releaseFileName(platform(), TYPE_ZIP_FILE));
	const newVersion = await extractVersion(output, compileResult, 'new-version');
	
	chdir(oldVersion);
	await pipeCommandOut(output, 'git', 'init', '.');
	await pipeCommandOut(output.screen, 'git', 'add', '.');
	await pipeCommandOut(output.screen, 'git', 'commit', '-m', 'old version at ' + oldVersion);
	
	output.writeln('move .git folder and clean old dir');
	await move(resolve(oldVersion, '.git'), resolve(newVersion, '.git'));
	output.writeln('ok');
	
	chdir(newVersion);
	await pipeCommandOut(output.screen, 'git', 'add', '.');
	const fileList = await getOutputCommand('git', 'diff', '--name-only', 'HEAD');
	
	output.writeln('copy changed file to dist folder');
	output.writeln(`  From: ${newVersion}`);
	output.writeln(`  To  : ${patchingDir}`);
	const lines = fileList.trim().split(/\n/g).map(e => e.trim()).filter(e => e).filter((file) => {
		if (/(?:^|\/)node_modules(?:\.asar(?:\.unpacked\/|$)?)?/.test(file)) {
			return false;
		}
		return true;
	});
	if (lines.length === 0) {
		throw new Error('Nothing changed.');
	}
	output.writeln('---------------------------');
	output.writeln(lines.join('\n'));
	output.writeln('---------------------------');
	for (const file of lines) {
		const source = resolve(newVersion, file);
		const target = resolve(patchingDir, file);
		mkdirpSync(dirname(target));
		output.write(`copy ${file}\n`);
		output.screen.write(`copy ${source} => ${target}\n`);
		await copy(source, target).catch((e) => {
			if (e.code === 'ENOENT') { // missing file => deleted from git
				output.log('ignore missing file: ', e.message);
				return;
			} else {
				output.fail('failed: ' + e.message);
				throw e;
			}
		});
	}
	output.writeln('ok.');
	
	chdir(patchingDir);
	await removeDirectory(oldVersion);
	await removeDirectory(newVersion);
	
	return patchingDir;
}

export async function createPatch(output: OutputStreamControl, remote: IDEJson) {
	output.writeln('creating patch folder:');
	const diffFolder = await createDiffWithGit(output, remote);
	output.success('created patch folder: ' + diffFolder);
	
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