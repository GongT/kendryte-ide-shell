import { BUILD_ARTIFACTS_DIR, isMac } from '../environment';
import { debug, gulp, jeditor, platformDeps, platforms, task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { resolvePath } from '../library/misc/pathUtil';
import { updaterFileName } from '../library/paths/updater';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { AWS_RELEASE_UPDATER_PATH } from '../library/releaseInfo/s3Keys';
import { compressTasks } from './release.compress';
import { createReleaseTag } from './releaseTag';

function realAwsUpload() {
	const matches = platforms.map((platform) => {
		return resolvePath(BUILD_ARTIFACTS_DIR, updaterFileName(platform));
	});
	return gulp.src(matches, {base: BUILD_ARTIFACTS_DIR, buffer: true})
	           .pipe(gulpS3.dest({base: AWS_RELEASE_UPDATER_PATH}))
	           .pipe(debug({title: 'uploadComplete:'}));
}

task('aws:upload:test', [], () => {
	// set BUILD_BUILDNUMBER=2019xxxxx
	return realAwsUpload();
});

function getDeps() {
	if (isMac) {
		return platformDeps('darwin', [compressTasks]);
	} else {
		return [
			...platformDeps('win32', [compressTasks]),
			...platformDeps('linux', [compressTasks]),
		];
	}
}

const awsUploadZipFilesTask = task('aws:upload', getDeps(), realAwsUpload);

export const awsModifyJsonTask = task('aws:update.json', [awsUploadZipFilesTask], () => {
	const version = createReleaseTag();
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             updaterVersion: version,
	             }))
	             .pipe(gulpS3.dest());
});
