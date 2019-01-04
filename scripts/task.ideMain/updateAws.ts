import { isMac } from '../environment';
import { everyPlatform, log, platformDeps, task } from '../library/gulp';
import { saveRemoteState } from '../library/jsonDefine/releaseRegistry';
import { artifactsRepackTask } from './artifacts';
import { createPatchesFiles } from './patches';

everyPlatform('ide', [artifactsRepackTask, createPatchesFiles], async (platform) => {
	// this is for debug
	await saveRemoteState();
	log('Released new version for %s', platform);
});

function getDeps() {
	if (isMac) {
		return platformDeps('darwin', [artifactsRepackTask, createPatchesFiles]);
	} else {
		return [
			...platformDeps('win32', [artifactsRepackTask, createPatchesFiles]),
			...platformDeps('linux', [artifactsRepackTask, createPatchesFiles]),
		];
	}
}

export const ideUploadJson = task('ide:json', getDeps(), () => {
	return saveRemoteState();
});
