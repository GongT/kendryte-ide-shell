import { appendFile, copy, mkdirp, pathExists, readJson, rename } from 'fs-extra';
import { basename } from 'path';
import { BUILD_ARTIFACTS_DIR, isCI, isForceRun } from '../environment';
import { removeDirectory } from '../ide/codeblocks/removeDir';
import { getOutputCommandAt, simpleCommandAt } from '../library/childprocess/complex';
import { shellExec } from '../library/childprocess/simple';
import { everyPlatform, ITaskPlatform, log, task } from '../library/gulp';
import { compress7z } from '../library/gulp/7z';
import { IPackageJson } from '../library/jsonDefine/package.json';
import { checkRemoteNeedPatch, ensureVersionPatch } from '../library/jsonDefine/releaseRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { writeFile } from '../library/misc/fsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { platformResourceAppDir } from '../library/paths/app';
import { artifactsExtractedTempPath, extractTempDir, patchDownloadKey } from '../library/paths/ide';
import { artifactsPrepareTask } from './artifacts';
import { downloadPrevVersion } from './download.prev';

function noop(): any {
	return task('ide:patches:create', () => {
		log('is force run, skip patch');
	});
}

export const createPatchesFiles: ITaskPlatform = isForceRun? noop() : everyPlatform('ide:patches:create', [
	artifactsPrepareTask,
], async (platform) => {
	const result = nativePath(artifactsExtractedTempPath(platform, 'latest'), platformResourceAppDir(platform));
	const packageJsonFile = nativePath(result, 'package.json');
	log('patches read latest package.json from %s', packageJsonFile);
	const resultVersion: IPackageJson = await readJson(packageJsonFile);
	
	if (!await checkRemoteNeedPatch(platform, resultVersion)) {
		log('patch for %s is ignored.', platform);
		return;
	}
	
	await downloadPrevVersion(platform);
	const base = nativePath(artifactsExtractedTempPath(platform, 'prev'), platformResourceAppDir(platform));
	log('patches read prev package.json from %s/package.json', base);
	const baseVersion: IPackageJson = await readJson(nativePath(base, 'package.json'));
	
	if (resultVersion.version !== baseVersion.version) {
		throw new Error(`impossible: current released BIG version (${baseVersion.version}) is not same with pipeline result (${resultVersion.version}).`);
	}
	if (resultVersion.patchVersion === baseVersion.patchVersion) {
		throw new Error(`impossible: current released patchVersion (${baseVersion.patchVersion}) is same with  pipeline result (${resultVersion.patchVersion}).`);
	}
	
	const mergingDir = extractTempDir('patch-merging-' + platform);
	const opts = {
		overwrite: true,
		preserveTimestamps: true,
		recursive: true,
	};
	
	log('create patch from %s to %s', base, result);
	
	const baseGit = nativePath(base, '.git');
	await removeDirectory(baseGit);
	if (isCI) {
		shellExec('git', 'config', '--global', 'user.email', 'ci@kendryte.com');
		shellExec('git', 'config', '--global', 'user.name', 'Kendryte CI');
	} else {
		console.log('not CI, git config skip');
	}
	await simpleCommandAt(base, 'git', 'init', '.');
	await simpleCommandAt(base, 'git', 'add', '.');
	await simpleCommandAt(base, 'git', 'commit', '--quiet', '-m', 'old version: ' + baseVersion.patchVersion);
	
	log('move %s to %s', baseGit, mergingDir);
	await mkdirp(mergingDir);
	await rename(baseGit, nativePath(mergingDir, '.git'));
	
	log('copy replace from %s to %s', result, mergingDir);
	await copy(result, mergingDir, opts);
	await simpleCommandAt(mergingDir, 'git', 'add', '.');
	const fileList = await getOutputCommandAt(mergingDir, 'git', 'diff', '--name-only', 'HEAD');
	const lines = fileList.trim().split(/\n/g).map(e => e.trim()).filter(e => e);
	
	const resultDir = extractTempDir('patch-result-' + platform);
	if (lines.length === 0) {
		log('Nothing changed');
		await writeFile(nativePath(resultDir, 'empty-patch.txt'), (new Date()).toISOString());
	} else {
		log('---------------------------');
		lines.forEach(l => log(l));
		log('---------------------------');
		
		const deletedListFile = nativePath(resultDir, 'delete.lst');
		for (const file of lines) {
			const from = nativePath(mergingDir, file);
			if (await pathExists(from)) {
				await copy(from, nativePath(resultDir, file));
			} else {
				log('Deleted: %s', file);
				await appendFile(deletedListFile, file + '\n');
			}
		}
	}
	
	const patchFileKey = patchDownloadKey(resultVersion, platform);
	const zipFile = nativePath(BUILD_ARTIFACTS_DIR, basename(patchFileKey));
	await compress7z(zipFile, resultDir);
	await ExS3.instance().uploadLocalFile(patchFileKey, zipFile);
	
	await ensureVersionPatch(platform, resultVersion, ExS3.instance().websiteUrl(patchFileKey));
});
