import { platform } from 'os';
import { log } from '../../library/gulp';
import {
	ensurePatchData,
	getRemoteVersion,
	IDEJson,
	loadRemoteState,
	makeNewRemote,
	saveRemoteState,
	storeRemoteVersion,
	SYS_NAME,
} from '../../library/jsonDefine/releaseRegistry';
import { calcPatchFileAwsKey, ExS3 } from '../../library/misc/awsUtil';
import { getPackageData } from '../../library/misc/fsUtil';
import { globalInterruptLog } from '../../library/misc/globalOutput';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { checkBaseIsDifferent, checkPatchIsDifferent, ensureBuildComplete } from '../publisher/checkVersions';
import { createPatch } from '../publisher/createPatch';
import { publishCompiledResult } from '../publisher/publishCompiledResult';

whatIsThis(
	'Publish created 7z archive(s) to S3',
	'上传创建的7z压缩包到S3',
);

const forceOverwride = process.argv.includes('--force');

runMain(async () => {
	await ensureBuildComplete();
	
	globalInterruptLog('HTTP_PROXY=%s', process.env.HTTP_PROXY);
	
	const packData = await getPackageData();
	
	log('loading IDE.json from AWS.');
	let remote = await loadRemoteState().catch((e) => {
		if (process.argv.includes('-f')) {
			log('Not able to load state from aws. but --force is set, will create brand new release.');
			return makeNewRemote();
		} else {
			throw e;
		}
	});
	log('loaded version data.');
	
	log(
		`  remote version=%s patch=%s\n  local  version=%s patch=%s`,
		getRemoteVersion(remote, 'main') || 'Null',
		getRemoteVersion(remote, 'patch') || 'Null',
		packData.version || 'Null',
		packData.patchVersion || 'Null',
	);
	
	if (await checkBaseIsDifferent(remote)) {
		log('base version has changed, publish new version.');
		remote.patches = [];
		await publishCompiledResult(remote);
	} else if (await checkPatchIsDifferent(remote)) {
		log('base version unchanged, but patch version changed, publish new patch.');
		await createAndPublishPatch(remote);
		
		await publishCompiledResult(remote);
	} else if (forceOverwride) {
		log('Everything is up to date. FORCE UPDATE.');
		await createAndPublishPatch(remote);
		await publishCompiledResult(remote);
	} else {
		log('Done. Everything is up to date.');
		return;
	}
	
	log('Done.');
});

async function createAndPublishPatch(remote: IDEJson) {
	const packageJson = getPackageData();
	storeRemoteVersion(remote, 'patch', packageJson.patchVersion);
	
	const patchFile = await createPatch(remote);
	
	const key = calcPatchFileAwsKey(platform());
	const patchUrl = await ExS3.instance().uploadLocalFile(key, patchFile);
	
	const data = ensurePatchData(packageJson.patchVersion, remote);
	data[SYS_NAME].generic = patchUrl;
	
	log('saving IDE.json to AWS.');
	await saveRemoteState(remote);
}
