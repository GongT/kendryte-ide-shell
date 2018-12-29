import { BUILD_ARTIFACTS_DIR } from '../environment';
import { gulp, jeditor, task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { updaterFileName } from '../library/paths/updater';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { AWS_RELEASE_UPDATER_PATH } from '../library/releaseInfo/s3Keys';
import { compressTasks } from './release.compress';
import { createReleaseTag } from './releaseTag';

const awsUploadZipFilesTask = task('aws:upload', [compressTasks], () => {
	return gulp.src(BUILD_ARTIFACTS_DIR + updaterFileName('*'), {base: BUILD_ARTIFACTS_DIR, buffer: false})
	           .pipe(gulpS3.dest({base: AWS_RELEASE_UPDATER_PATH}));
});

export const awsModifyJsonTask = task('aws:update.json', [awsUploadZipFilesTask], () => {
	const version = createReleaseTag();
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             updaterVersion: version,
	             }))
	             .pipe(gulpS3.dest());
});
