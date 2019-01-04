import { everyPlatform, log, task } from '../library/gulp';
import { saveRemoteState } from '../library/jsonDefine/releaseRegistry';
import { artifactsRepackTask } from './artifacts';
import { createPatchesFiles } from './patches';

everyPlatform('ide', [artifactsRepackTask, createPatchesFiles], async (platform) => {
	// this is for debug
	await saveRemoteState();
	log('Released new version for %s', platform);
});

export const ideUploadJson = task('ide:json', [artifactsRepackTask, createPatchesFiles], () => {
	return saveRemoteState();
});
