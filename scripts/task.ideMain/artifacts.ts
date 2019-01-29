import { copy, readJson } from 'fs-extra';
import { basename } from 'path';
import { BUILD_ARTIFACTS_DIR, isCI, isForceRun } from '../environment';
import { everyPlatform, log } from '../library/gulp';
import { compress7z, extract7z } from '../library/gulp/7z';
import { createDownload2Stream } from '../library/gulp/download';
import { IPackageJson } from '../library/jsonDefine/package.json';
import { checkRemoteOutdated, ensureVersionMain } from '../library/jsonDefine/releaseRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { platformResourceAppDir } from '../library/paths/app';
import { artifactsExtractedTempPath, artifactsLocalTempPath, artifactsS3TempUrl, ideDownloadKey, } from '../library/paths/ide';
import { extensionsPackageTask } from '../task.extensions/package';
import { EXTENSIONS_DIST_PATH_RESULT, listExtension } from '../task.extensions/path';
import { cleanExtractTask } from './cleanup';

const artifactsFetchTask = everyPlatform('ide:artifacts:fetch', [], (platform: string) => {
	if (isCI) {
		log('isCI, `ide:artifacts:fetch` skip.');
		return Promise.resolve();
	}
	const url = artifactsS3TempUrl(platform);
	const saveTo = artifactsLocalTempPath(platform, 'latest');
	return createDownload2Stream(url, saveTo);
});

export const artifactsPrepareTask = everyPlatform('ide:artifacts:prepare', [
	cleanExtractTask,
	artifactsFetchTask,
	extensionsPackageTask,
], async (platform) => {
	const saveTo = artifactsLocalTempPath(platform, 'latest');
	const extractTo = artifactsExtractedTempPath(platform, 'latest');
	
	await extract7z(saveTo, extractTo);
	
	for (const name of listExtension()) {
		const from = nativePath(EXTENSIONS_DIST_PATH_RESULT, name);
		const to = nativePath(extractTo, platformResourceAppDir(platform), 'extensions', name);
		await copy(from, to);
	}
});

export const artifactsRepackTask = everyPlatform('ide:artifacts:repack', [artifactsPrepareTask], async (platform) => {
	const sourceFrom = artifactsExtractedTempPath(platform, 'latest');
	const packageJsonFile = nativePath(sourceFrom, platformResourceAppDir(platform), 'package.json');
	log('repack read latest package.json from %s', packageJsonFile);
	
	const packageJson: IPackageJson = await readJson(packageJsonFile);
	
	if (!await checkRemoteOutdated(platform, packageJson) && !isForceRun) {
		log('upload for %s is ignored, remote version is same with local.\n    set -f to force overwrite.', platform);
		return;
	}
	
	const willUploadKey = ideDownloadKey(packageJson, platform);
	
	const zipFile = nativePath(BUILD_ARTIFACTS_DIR, basename(willUploadKey));
	
	await compress7z(zipFile, sourceFrom);
	
	await ExS3.instance().uploadLocalFile(willUploadKey, zipFile);
	
	await ensureVersionMain(platform, packageJson, ExS3.instance().websiteUrl(willUploadKey));
});
