require('source-map-support/register');

import { log } from 'util';
import { task } from '../library/gulp';
import { copyDevelopChannelTask, developmentTask, watchTask } from './compile';
import { awsModifyJsonTask } from './release.aws';
import { compressTasks } from './release.compress';

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
], () => {
	log('Kendryte shell (updater) release version success.');
});

