import { BUILD_ARTIFACTS_DIR } from '../environment';
import { everyPlatform, gulpSrc, jeditor, task, } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { offlinePackageFileName } from '../library/paths/offlinePackages';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { AWS_RELEASE_PACKAGES_PATH } from '../library/releaseInfo/s3Keys';
import { createReleaseTag } from '../library/releaseInfo/releaseTag';
import { createZipFiles } from './compress';

const uploadPackage = everyPlatform('offpack:upload', [createZipFiles], (platform) => {
	return gulpSrc(BUILD_ARTIFACTS_DIR, offlinePackageFileName(platform))
		.pipe(gulpS3.dest({base: AWS_RELEASE_PACKAGES_PATH}));
});
everyPlatform('offpack', [uploadPackage], () => {

});
task('offpack:update.json:only', [], updateRelease);

export const modifyJsonTask = task('offpack:update.json', [uploadPackage], updateRelease);

function updateRelease() {
	const version = createReleaseTag();
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             offlinePackageVersion: version,
	             }))
	             .pipe(gulpS3.dest());
}
