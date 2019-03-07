import { join } from 'path';
import { myScriptSourcePath } from '../environment';
import { buffer, downloadBuffer, gulp, gulpSrc, jeditor, mergeStream, rename, task, VinylFile, zip } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { startsWithFolder } from '../library/gulp/path';
import { removeFirstComponent } from '../library/gulp/pathTools';
import { simpleTransformStream } from '../library/gulp/transform';
import { nativePath } from '../library/misc/pathUtil';
import { OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH } from '../library/releaseInfo/s3Keys';
import { PM_TEMP_DIR } from './clean';
import { SdkBranch, SdkType } from './version';

function ignoreSomeSdkFile(f: VinylFile) {
	if (f.isDirectory()) {
		return void 0;
	}
	
	if (f.basename.startsWith('.')) {
		return void 0;
	}
	
	if (
		startsWithFolder(f, 'cmake') ||
		startsWithFolder(f, 'src') ||
		startsWithFolder(f, '.github')
	) {
		return void 0;
	}
	
	if (
		f.relative.includes('third_party/fatfs/documents') ||
		f.relative.includes('third_party/lwip/doc') ||
		f.relative.includes('third_party/lwip/test')
	) {
		return void 0;
	}
	
	if (f.relative.startsWith('CMakeLists.txt')) {
		return void 0;
	}
	
	return f;
}

function createSdkTask(type: SdkType, branch: SdkBranch) {
	return task(`pm:${type}:${branch}`, () => {
		return mergeStream(
			downloadBuffer(`https://github.com/kendryte/kendryte-${type}-sdk/archive/${branch}.zip`)
				.pipe(zip.src())
				.pipe(rename(removeFirstComponent))
				.pipe(simpleTransformStream(ignoreSomeSdkFile)),
			gulpSrc(myScriptSourcePath(__dirname), `${type}.json`)
				.pipe(jeditor({version: branch}))
				.pipe(rename((e: VinylFile) => e.basename = 'kendryte-package')),
			gulpSrc(myScriptSourcePath(__dirname), `${type}.cmake`)
				.pipe(rename((e: VinylFile) => e.basename = 'asm')),
		)
			.pipe(gulp.dest(nativePath(PM_TEMP_DIR, `${type}-sdk-${branch}`)))
			.pipe(zip.zip(`${branch}.zip`))
			.pipe(buffer())
			.pipe(gulpS3.dest({
				base: join(OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH, `kendryte-${type}-sdk`),
			}));
	});
}

export const standaloneSdk = task('pm:standalone', [
	createSdkTask(SdkType.standalone, SdkBranch.master),
	createSdkTask(SdkType.standalone, SdkBranch.develop),
]);

export const freertosSdk = task('pm:freertos', [
	createSdkTask(SdkType.freertos, SdkBranch.master),
	createSdkTask(SdkType.freertos, SdkBranch.develop),
]);
