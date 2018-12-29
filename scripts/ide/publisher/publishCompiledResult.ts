import { OutputStreamControl } from '@gongt/stillalive';
import { platform } from 'os';
import { resolve } from 'path';
import { releaseZipStorageFolder } from '../codeblocks/zip';
import { CURRENT_PLATFORM_TYPES, releaseFileName } from '../codeblocks/zip.name';
import { IDEJson, saveRemoteState, storeRemoteVersion, SYS_NAME } from '../../library/jsonDefine/releaseRegistry';
import { calcReleaseFileAwsKey, ExS3 } from '../../library/misc/awsUtil';
import { getPackageData, getProductData } from '../../library/misc/fsUtil';

export async function publishCompiledResult(output: OutputStreamControl, remote: IDEJson) {
	const packageJson = getPackageData();
	const prodData = getProductData();
	
	remote.version = `${packageJson.version}-${prodData.quality}`;
	storeRemoteVersion(remote, 'main', packageJson.version);
	
	output.writeln('uploading to s3...');
	
	const plat = platform();
	const rType = CURRENT_PLATFORM_TYPES.slice().reverse(); // this put first -> remote[SYS_NAME]
	for (const type of rType) {
		const zipResult = resolve(releaseZipStorageFolder(), releaseFileName(plat, type));
		const s3Key = calcReleaseFileAwsKey(plat, type);
		
		const result = await ExS3.instance().uploadLocalFile(s3Key, zipResult);
		
		output.success(`uploaded ${type} to ${result}`);
		remote[SYS_NAME] = result;
	}
	
	output.writeln('saving IDE.json to AWS.');
	await saveRemoteState(remote);
}
