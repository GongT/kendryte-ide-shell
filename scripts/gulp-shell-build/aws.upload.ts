import { BUILD_ARTIFACTS_DIR, getProjectName } from '../library/environment';
import { aws, gulp, task } from '../library/gulp';
import { compressedFileName } from './release.compress';

export const uploadTask = task('aws:upload', [], () => {
	return gulp
		.src(BUILD_ARTIFACTS_DIR + compressedFileName('*'))
		.pipe(aws.s3(getProjectName(), {
			aws_region: process.env.AWS_REGION,
			aws_key: process.env.AWS_ACCESS_KEY_ID,
			aws_secret: process.env.AWS_SECRET_ACCESS_KEY,
		}));
});
