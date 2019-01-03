import { everyPlatform, IPlatformTypes } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { createRequestDownPromise } from '../library/gulp/download';
import { IProductJson } from '../library/jsonDefine/product.json';
import { loadRemoteState } from '../library/jsonDefine/releaseRegistry';
import { readFile, writeFile } from '../library/misc/fsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { platformResourceAppDir } from '../library/paths/app';
import { artifactsExtractedTempPath, artifactsLocalTempPath } from '../library/paths/ide';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
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
	
	const productFile = nativePath(extractTo, platformResourceAppDir(platform), 'product.json');
	const productData: IProductJson = JSON.parse(await readFile(productFile));
	if (productData.quality !== getReleaseChannel()) {
		productData.quality = getReleaseChannel();
		await writeFile(productFile, JSON.stringify(productData, null, 2) + '\n');
	}
}
