import { platform } from 'os';
import { resolve } from 'path';
import { log } from '../../library/gulp';
import { IDEJson, saveRemoteState, storeRemoteVersion, SYS_NAME } from '../../library/jsonDefine/releaseRegistry';
import { calcReleaseFileAwsKey, ExS3 } from '../../library/misc/awsUtil';
import { getPackageData, getProductData } from '../../library/misc/fsUtil';
import { releaseZipStorageFolder } from '../codeblocks/zip';
import { releaseFileName, TYPE_ZIP_FILE } from '../codeblocks/zip.name';

export async function publishCompiledResult(remote: IDEJson) {
	const packageJson = getPackageData();
	const prodData = getProductData();
	
	remote.version = `${packageJson.version}-${prodData.quality}`;
	storeRemoteVersion(remote, 'main', packageJson.version);
	
	log('uploading to s3...');
	
	const plat = platform();
	const zipResult = resolve(releaseZipStorageFolder(), releaseFileName(plat, TYPE_ZIP_FILE));
	const s3Key = calcReleaseFileAwsKey(plat, TYPE_ZIP_FILE);
	
	const result = await ExS3.instance().uploadLocalFile(s3Key, zipResult);
	
	log(`uploaded ${TYPE_ZIP_FILE} to ${result}`);
	remote[SYS_NAME] = result;
	
	log('saving IDE.json to AWS.');
	await saveRemoteState(remote);
}
