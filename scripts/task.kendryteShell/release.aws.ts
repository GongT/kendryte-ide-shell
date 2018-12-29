import { BUILD_ARTIFACTS_DIR } from '../environment';
import { debug, gulp, jeditor, platforms, task } from '../library/gulp';
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
	return gulp.src(matches, {base: BUILD_ARTIFACTS_DIR, buffer: false})
	           .pipe(gulpS3.dest({base: AWS_RELEASE_UPDATER_PATH}))
	           .pipe(debug({title: 'uploadComplete:'}));
}

task('aws:upload:test', [], () => {
	// set BUILD_BUILDNUMBER=2019xxxxx
	return realAwsUpload();
});

const awsUploadZipFilesTask = task('aws:upload', [compressTasks], realAwsUpload);

export const awsModifyJsonTask = task('aws:update.json', [awsUploadZipFilesTask], () => {
	const version = createReleaseTag();
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             updaterVersion: version,
	             }))
	             .pipe(gulpS3.dest());
});
