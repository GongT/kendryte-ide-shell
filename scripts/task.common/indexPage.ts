import { createIndexFileContent } from '../index-render';
import { task } from '../library/gulp';
import { ExS3 } from '../library/misc/awsUtil';
import { getIndexPageObjectKey } from '../library/releaseInfo/s3Keys';

export const awsCreateIndexTask = task('aws:create.index', [], async () => {
	const indexData = await createIndexFileContent();
	await ExS3.instance().putText(getIndexPageObjectKey(), indexData, 'text/html');
});
