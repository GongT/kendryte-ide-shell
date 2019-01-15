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
import { getVersionString } from './version';

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
		startsWithFolder(f, 'third_party') ||
		startsWithFolder(f, '.github')
	) {
		return void 0;
	}
	
	if (f.basename.startsWith('CMakeLists.txt')) {
		return void 0;
	}
	
	return f;
}

export const standaloneSdk = task('pm:standalone', [], () => {
	return mergeStream(
		downloadBuffer('https://github.com/kendryte/kendryte-standalone-sdk/archive/master.zip')
			.pipe(zip.src())
			.pipe(rename(removeFirstComponent))
			.pipe(simpleTransformStream(ignoreSomeSdkFile)),
		gulpSrc(myScriptSourcePath(__dirname), 'standalone.json')
			.pipe(jeditor({version: getVersionString()}))
			.pipe(rename((e: VinylFile) => e.basename = 'kendryte-package')),
		gulpSrc(myScriptSourcePath(__dirname), 'standalone.cmake')
			.pipe(rename((e: VinylFile) => e.basename = 'asm')),
	)
		.pipe(gulp.dest(nativePath(PM_TEMP_DIR, 'standalone-sdk')))
		.pipe(zip.zip(getVersionString() + '.zip'))
		.pipe(buffer())
		.pipe(gulpS3.dest({
			base: join(OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH, 'kendryte-standalone-sdk'),
		}));
});

export const freertosSdk = task('pm:freertos', [], () => {
	return mergeStream(
		downloadBuffer('https://github.com/kendryte/kendryte-freertos-sdk/archive/master.zip')
			.pipe(zip.src())
			.pipe(rename(removeFirstComponent))
			.pipe(simpleTransformStream(ignoreSomeSdkFile)),
		gulpSrc(myScriptSourcePath(__dirname), 'freertos.json')
			.pipe(jeditor({version: getVersionString()}))
			.pipe(rename((e: VinylFile) => e.basename = 'kendryte-package')),
		gulpSrc(myScriptSourcePath(__dirname), 'freertos.cmake')
			.pipe(rename((e: VinylFile) => e.basename = 'asm')),
	)
		.pipe(gulp.dest(nativePath(PM_TEMP_DIR, 'freertos-sdk')))
		.pipe(zip.zip(getVersionString() + '.zip'))
		.pipe(buffer())
		.pipe(gulpS3.dest({
			base: join(OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH, 'kendryte-freertos-sdk'),
		}));
});
