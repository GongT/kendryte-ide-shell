import { BUILD_ARTIFACTS_DIR } from '../environment';
import { debug, gulpSrc, jeditor, log, mergeStream, platforms, task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { updaterFileName } from '../library/paths/updater';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { createReleaseTag } from '../library/releaseInfo/releaseTag';
import { getReleaseUpdaterPath } from '../library/releaseInfo/s3Keys';
import { compressTasks } from './release.compress';

function realAwsUpload() {
	return mergeStream(...platforms.map((platform) => {
		return gulpSrc(BUILD_ARTIFACTS_DIR, updaterFileName(platform))
			.pipe(gulpS3.dest({base: getReleaseUpdaterPath()}));
	})).pipe(debug({title: 'uploadComplete:'}));
}

task('aws:upload:test', [], () => {
	// set BUILD_BUILDNUMBER=2019xxxxx
	return realAwsUpload();
});

const awsUploadZipFilesTask = task('aws:upload', [compressTasks], realAwsUpload);

export const awsModifyJsonTask = task('aws:update.json', [awsUploadZipFilesTask], () => {
	const version = createReleaseTag();
	log('using version string: %s', version);
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             updaterVersion: version,
	             }))
	             .pipe(gulpS3.dest());
});
