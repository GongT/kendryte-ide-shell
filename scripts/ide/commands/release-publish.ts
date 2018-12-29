import { OutputStreamControl } from '@gongt/stillalive';
import { platform } from 'os';
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
import { usePretty } from '../../library/misc/usePretty';
import { checkBaseIsDifferent, checkPatchIsDifferent, ensureBuildComplete } from '../publisher/checkVersions';
import { createPatch } from '../publisher/createPatch';
import { publishCompiledResult } from '../publisher/publishCompiledResult';

whatIsThis(
	'Publish created 7z archive(s) to S3',
	'上传创建的7z压缩包到S3',
);

const forceOverwride = process.argv.includes('--force');

runMain(async () => {
	const output = usePretty('publish');
	
	await ensureBuildComplete(output);
	
	globalInterruptLog('HTTP_PROXY=%s', process.env.HTTP_PROXY);
	
	const packData = await getPackageData();
	
	output.writeln('loading IDE.json from AWS.');
	let remote = await loadRemoteState().catch((e) => {
		if (process.argv.includes('-f')) {
			output.fail('Not able to load state from aws. but --force is set, will create brand new release.');
			return makeNewRemote();
		} else {
			throw e;
		}
	});
	output.success('loaded version data.');
	
	output.log(
		`  remote version=%s patch=%s\n  local  version=%s patch=%s`,
		getRemoteVersion(remote, 'main') || 'Null',
		getRemoteVersion(remote, 'patch') || 'Null',
		packData.version || 'Null',
		packData.patchVersion || 'Null',
	);
	
	if (await checkBaseIsDifferent(remote)) {
		output.writeln('base version has changed, publish new version.');
		remote.patches = [];
		await publishCompiledResult(output, remote);
	} else if (await checkPatchIsDifferent(remote)) {
		output.writeln('base version unchanged, but patch version changed, publish new patch.');
		await createAndPublishPatch(output, remote);
		
		await publishCompiledResult(output, remote);
	} else if (forceOverwride) {
		output.success('Everything is up to date. FORCE UPDATE.');
		await createAndPublishPatch(output, remote);
		await publishCompiledResult(output, remote);
	} else {
		output.success('Done. Everything is up to date.');
		return;
	}
	
	output.writeln('Done.');
});

async function createAndPublishPatch(output: OutputStreamControl, remote: IDEJson) {
	const packageJson = getPackageData();
	storeRemoteVersion(remote, 'patch', packageJson.patchVersion);
	
	const patchFile = await createPatch(output, remote);
	
	const key = calcPatchFileAwsKey(platform());
	const patchUrl = await ExS3.instance().uploadLocalFile(key, patchFile);
	
	const data = ensurePatchData(packageJson.patchVersion, remote);
	data[SYS_NAME].generic = patchUrl;
	
	output.writeln('saving IDE.json to AWS.');
	await saveRemoteState(remote);
}
