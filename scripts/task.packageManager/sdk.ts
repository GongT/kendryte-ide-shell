import { join } from 'path';
import { buffer, downloadBuffer, log, rename, task, VinylFile, zip } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { removeFirstComponent } from '../library/gulp/pathTools';
import { simpleTransformStream } from '../library/gulp/transform';
import { PackageTypes } from '../library/jsonDefine/packageRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { streamPromise } from '../library/misc/streamUtil';
import { OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH } from '../library/releaseInfo/s3Keys';
import { clearPmLocalTempTask } from './clean';
import { packageManagerFetchJson, packageManagerFlushJson } from './custom';
import { findOrAppendVersion, findOrPrependPackage } from './registry';
import { SdkBranch, SdkType } from './version';

function ignoreSomeSdkFile(f: VinylFile) {
	if (f.isDirectory()) {
		return void 0;
	}

	if (f.relative.startsWith('.')) {
		return void 0;
	}
	if (f.relative.startsWith('CMakeLists.txt')) {
		return void 0;
	}
	if (f.relative.startsWith('package.json')) {
		return void 0;
	}

	return f;
}

async function runSdkTask(type: SdkType, branch: SdkBranch) {
	const name = `kendryte-${type}-sdk`;
	const d = new Date().toISOString().replace(/:/g, '-').split('.')[0];
	const createFileName = `${branch}.${d}.zip`;
	const s3BaseKey = join(OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH, `kendryte-${type}-sdk`);
	const s3Key = s3BaseKey + '/' + createFileName;
	const githubUrl = `https://github.com/kendryte/kendryte-${type}-sdk/archive/${branch}.zip`;

	log('Download file from %s\t\tto %s.', githubUrl, createFileName);
	const p = downloadBuffer(githubUrl)
		.pipe(zip.src())
		.pipe(rename(removeFirstComponent))
		.pipe(simpleTransformStream(ignoreSomeSdkFile))
		// .pipe(gulpDest(nativePath(PM_TEMP_DIR, createFileName)))
		.pipe(zip.zip(createFileName))
		.pipe(buffer())
		.pipe(gulpS3.dest({base: s3BaseKey}));

	await streamPromise(p);

	const registry = await packageManagerFetchJson(PackageTypes.Library);
	const packageRegistry = findOrPrependPackage(PackageTypes.Library, name, registry, true);
	const versionRegistry = findOrAppendVersion(branch, packageRegistry.versions);
	if (!packageRegistry.homepage) {
		packageRegistry.homepage = `https://github.com/kendryte/${name}`;
	}
	versionRegistry.downloadUrl = ExS3.instance().websiteUrl(s3Key);
}

export const updateSdk = task('pm:sdk', [clearPmLocalTempTask], async () => {
	await runSdkTask(SdkType.standalone, SdkBranch.develop);
	await runSdkTask(SdkType.freertos, SdkBranch.develop);
	await packageManagerFlushJson();
});
