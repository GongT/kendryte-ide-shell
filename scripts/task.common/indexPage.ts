import { createIndexFileContent } from '../index-render';
import { ExS3 } from '../library/misc/awsUtil';
import { getIndexPageObjectKey } from '../library/releaseInfo/s3Keys';

export async function createIndexAndUpload() {
	const indexData = await createIndexFileContent();
	await ExS3.instance().putText(getIndexPageObjectKey(), indexData, 'text/html');
}
