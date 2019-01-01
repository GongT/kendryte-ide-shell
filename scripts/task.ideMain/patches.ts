import { copy, readJson } from 'fs-extra';
import { basename } from 'path';
import { isForceRun } from '../environment';
import { getOutputCommandAt, simpleCommandAt } from '../library/childprocess/complex';
import { everyPlatform, log, task } from '../library/gulp';
import { compress7z } from '../library/gulp/7z';
import { IPackageJson } from '../library/jsonDefine/package.json';
import { checkRemoteNeedPatch } from '../library/jsonDefine/releaseRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { platformResourceAppDir } from '../library/paths/app';
import { artifactsExtractedTempPath, extractTempDir, patchDownloadKey } from '../library/paths/ide';
import { artifactsPrepareTask } from './artifacts';
import { prevBuildDownloadAndExtractTask } from './download.prev';

function noop() {
	return task('ide:patches:create', () => {
		log('is force run, skip patch');
	});
}

export const createPatchesFiles = isForceRun? noop() : everyPlatform('ide:patches:create', [
	prevBuildDownloadAndExtractTask,
	artifactsPrepareTask,
], async (platform) => {
	const result = nativePath(artifactsExtractedTempPath(platform, 'latest'), platformResourceAppDir(platform));
	const resultVersion: IPackageJson = await readJson(nativePath(result, 'package.json'));
	
	if (!await checkRemoteNeedPatch(platform, resultVersion)) {
		log('patch for %s is ignored, remote version is same with local.', platform);
		return;
	}
	
	const base = nativePath(artifactsExtractedTempPath(platform, 'prev'), platformResourceAppDir(platform));
	const baseVersion: IPackageJson = await readJson(nativePath(base, 'package.json'));
	
	if (resultVersion.version !== baseVersion.version) {
		throw new Error('impossible: remote BIG version is not same with current.');
	}
	if (resultVersion.patchVersion === baseVersion.patchVersion) {
		throw new Error('impossible: remote patchVersion is same with current.');
	}
	
	const mergingDir = extractTempDir('patch-merging-' + platform);
	const opts = {
		overwrite: true,
		preserveTimestamps: true,
		recursive: true,
	};
	
	log('create patch from %s to %s', base, result);
	
	await copy(base, mergingDir, opts);
	await simpleCommandAt(mergingDir, 'git', 'init', '.');
	await simpleCommandAt(mergingDir, 'git', 'add', '.');
	await simpleCommandAt(mergingDir, 'git', 'commit', '-m', 'old version: ' + baseVersion.patchVersion);
	
	await copy(result, mergingDir, opts);
	await simpleCommandAt(mergingDir, 'git', 'add', '.');
	const fileList = await getOutputCommandAt(mergingDir, 'git', 'diff', '--name-only', 'HEAD');
	const lines = fileList.trim().split(/\n/g).map(e => e.trim()).filter(e => e);
	
	if (lines.length === 0) {
		throw new Error('Nothing changed.');
	}
	log('---------------------------');
	lines.forEach(l => log(l));
	log('---------------------------');
	
	const resultDir = extractTempDir('patch-result-' + platform);
	for (const file of lines) {
		await copy(nativePath(mergingDir, file), nativePath(resultDir, file));
	}
	
	const patchFileKey = patchDownloadKey(resultVersion, platform);
	const zipFile = extractTempDir(basename(patchFileKey));
	await compress7z(zipFile, resultDir);
	await ExS3.instance().uploadLocalFile(patchFileKey, zipFile);
});
