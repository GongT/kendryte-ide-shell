import { everyPlatform, IPlatformTypes } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { createRequestDownPromise } from '../library/gulp/download';
import { loadRemoteState } from '../library/jsonDefine/releaseRegistry';
import { artifactsExtractedTempPath, artifactsLocalTempPath } from '../library/paths/ide';
import { cleanExtractTask } from './cleanup';

export const prevBuildDownloadAndExtractTask = everyPlatform('ide:download:prev', [cleanExtractTask], async (platform) => {
	const state = await loadRemoteState(true);
	if (!state[platform]) {
		return;
	}
	await processSingle(state[platform].downloadUrl, platform);
});

async function processSingle(from: string, platform: IPlatformTypes) {
	const saveTo = artifactsLocalTempPath(platform, 'prev');
	await createRequestDownPromise(from, saveTo);
	
	const extractTo = artifactsExtractedTempPath(platform, 'prev');
	await extract7z(saveTo, extractTo);
}
