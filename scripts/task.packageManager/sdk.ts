import { join } from 'path';
import { myScriptSourcePath } from '../environment';
import { buffer, downloadBuffer, filter, gulpSrc, jeditor, mergeStream, rename, task, VinylFile, zip } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { removeFirstComponent } from '../library/gulp/pathTools';
import { OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH } from '../library/releaseInfo/s3Keys';
import { skipDirectories } from '../library/vscode/uitl';
import { getVersionString } from './version';

export const standaloneSdk = task('pm:standalone', [], () => {
	return mergeStream(
		downloadBuffer('https://github.com/kendryte/kendryte-standalone-sdk/archive/master.zip')
			.pipe(zip.src())
			.pipe(filter(['**', '!**/cmake', '!**/.github', '!**/CMakeLists.txt']))
			.pipe(skipDirectories())
			.pipe(rename(removeFirstComponent))
		,
		gulpSrc(myScriptSourcePath(__dirname), 'standalone.json')
			.pipe(jeditor({version: getVersionString()}))
			.pipe(rename((e: VinylFile) => e.basename = 'kendryte-package')),
		gulpSrc(myScriptSourcePath(__dirname), 'standalone.cmake')
			.pipe(rename((e: VinylFile) => e.basename = 'asm')),
	)
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
			.pipe(filter(['**', '!**/cmake', '!**/.github', '!**/CMakeLists.txt']))
			.pipe(skipDirectories())
			.pipe(rename(removeFirstComponent))
		,
		gulpSrc(myScriptSourcePath(__dirname), 'freertos.json')
			.pipe(jeditor({version: getVersionString()}))
			.pipe(rename((e: VinylFile) => e.basename = 'kendryte-package')),
		gulpSrc(myScriptSourcePath(__dirname), 'freertos.cmake')
			.pipe(rename((e: VinylFile) => e.basename = 'asm')),
	)
		.pipe(zip.zip(getVersionString() + '.zip'))
		.pipe(buffer())
		.pipe(gulpS3.dest({
			base: join(OBJKEY_PACKAGE_MANAGER_LIBRARY_PATH, 'kendryte-freertos-sdk'),
		}));
});
