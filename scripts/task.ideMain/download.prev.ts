import { IPlatformTypes, log } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { createRequestDownPromise } from '../library/gulp/download';
import { IProductJson } from '../library/jsonDefine/product.json';
import { loadRemoteState } from '../library/jsonDefine/releaseRegistry';
import { readFile, writeFile } from '../library/misc/fsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { platformResourceAppDir } from '../library/paths/app';
import { artifactsExtractedTempPath, artifactsLocalTempPath } from '../library/paths/ide';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';

export async function downloadPrevVersion(platform: IPlatformTypes) {
	const state = await loadRemoteState(true);
	if (!state[platform]) {
		log('patch for %s is impossible. remote does not has any version.', platform);
		return;
	}
	
	const saveTo = artifactsLocalTempPath(platform, 'prev');
	await createRequestDownPromise(state[platform].downloadUrl, saveTo);
	
	let extractTo = artifactsExtractedTempPath(platform, 'prev');
	if (platform === 'darwin') {
		await extract7z(saveTo, nativePath(extractTo, 'Contents')); // emmmm. publised packages do not have .app folder.
	} else {
		await extract7z(saveTo, extractTo);
	}
	
	const productFile = nativePath(extractTo, platformResourceAppDir(platform), 'product.json');
	const productData: IProductJson = JSON.parse(await readFile(productFile));
	if (productData.quality !== getReleaseChannel()) {
		productData.quality = getReleaseChannel();
		await writeFile(productFile, JSON.stringify(productData, null, 2) + '\n');
	}
}
