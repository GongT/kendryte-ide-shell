require('source-map-support/register');

import { log, task } from './library/gulp';
import { createIndexAndUpload } from './task.common/indexPage';
import { extensionsTask, extensionsWatchTask } from './task.extensions/gulpfile';
import { ideUploadJson } from './task.ideMain/updateAws';
import { developmentTask, watchTask } from './task.kendryteShell/compile';
import { awsModifyJsonTask } from './task.kendryteShell/release.aws';
import { compressTasks } from './task.kendryteShell/release.compress';
import { clearPmLocalTempTask } from './task.packageManager/clean';
import { publishUserCustom } from './task.packageManager/custom';
import { updateExampleRegistry, updateSdkRegistry } from './task.packageManager/registry';
import { modifyJsonTask } from './task.packages/upload';
import { scriptsTask, scriptsWatchTask } from './task.script/compile';

/* dev section */
task('default', [developmentTask, scriptsTask, extensionsTask], () => {
	log('Kendryte shell (updater) compile success.');
});
task('watch', [watchTask, scriptsWatchTask, extensionsWatchTask], () => {
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
	log('Kendryte shell (updater) release version success.');
});

/* packages section */
task('offpack', [
	modifyJsonTask,
], async () => {
	log('Offline packages upload success.');
});

/* ide main section */
task('ide', [
	ideUploadJson,
], () => {
	log('Kendryte IDE build complete.');
});

/* package manager section */
task('pm', [
	updateSdkRegistry,
	updateExampleRegistry,
]);

task('pm:publish', [clearPmLocalTempTask], publishUserCustom);

/* extra section */
task('aws:create.index', [], createIndexAndUpload);

