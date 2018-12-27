require('source-map-support/register');

import { log } from 'util';
import { task } from './library/gulp';
import { createIndexAndUpload } from './task.common/indexPage';
import { copyDevelopChannelTask, developmentTask, watchTask } from './task.kendryteShell/compile';
import { awsModifyJsonTask } from './task.kendryteShell/release.aws';
import { compressTasks } from './task.kendryteShell/release.compress';
import { modifyJsonTask } from './task.packages/upload';

/* dev section */
task('default', [developmentTask, copyDevelopChannelTask], () => {
	log('Kendryte shell (updater) compile success.');
});
task('watch', [watchTask, copyDevelopChannelTask], () => {
	log('Bye bye.');
});

/* build section */
task('build', [
	compressTasks,
], () => {
	log('Kendryte shell (updater) built success.');
});
task('release', [
	awsModifyJsonTask,
], async () => {
	await createIndexAndUpload();
	log('Kendryte shell (updater) release version success.');
});

/* packages section */
task('offpack', [
	modifyJsonTask,
], async () => {
	await createIndexAndUpload();
	log('Offline packages upload success.');
});
