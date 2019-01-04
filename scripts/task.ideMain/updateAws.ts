import { isMac } from '../environment';
import { everyPlatform, ISingleTask, log, task } from '../library/gulp';
import { saveRemoteState } from '../library/jsonDefine/releaseRegistry';
import { artifactsRepackTask } from './artifacts';
import { createPatchesFiles } from './patches';

everyPlatform('ide', [artifactsRepackTask, createPatchesFiles], async (platform) => {
	// this is for debug
	await saveRemoteState();
	log('Released new version for %s', platform);
});

function getDeps() {
	let tasks: ISingleTask[] = [];
	if (isMac) {
		tasks.push(artifactsRepackTask.darwin);
		if (createPatchesFiles.darwin) {
			tasks.push(createPatchesFiles.darwin);
		}
	} else {
		tasks.push(artifactsRepackTask.win32);
		tasks.push(artifactsRepackTask.linux);
		if (createPatchesFiles.win32) {
			tasks.push(createPatchesFiles.win32);
			tasks.push(createPatchesFiles.linux);
		}
	}
	return tasks;
}

export const ideUploadJson = task('ide:json', getDeps(), () => {
	return saveRemoteState();
});
