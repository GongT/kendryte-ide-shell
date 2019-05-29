require('source-map-support/register');

import { log, task } from './library/gulp';
import './task.azure/python2';
import { createIndexAndUpload } from './task.common/indexPage';
import { extensionsTask, extensionsWatchTask } from './task.extensions/gulpfile';
import { ideUploadJson } from './task.ideMain/updateAws';
import { developmentTask, watchTask } from './task.kendryteShell/compile';
import { awsModifyJsonTask } from './task.kendryteShell/release.aws';
import { compressTasks } from './task.kendryteShell/release.compress';
import { clearPmLocalTempTask } from './task.packageManager/clean';
import { publishLocal, publishUserCustom } from './task.packageManager/custom';
import { packageManagerPublishMonorepo } from './task.packageManager/monorepo';
import { updateExampleRegistry, updateSdkRegistry } from './task.packageManager/registry';
import { modifyJsonTask } from './task.packages/upload';
import { scriptsTask, scriptsWatchTask } from './task.script/compile';
import './task.translate/translate.gulpfile';

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
task('pm:local:publish', [clearPmLocalTempTask], publishLocal);
task('pm:monorepo', [clearPmLocalTempTask], packageManagerPublishMonorepo);

/* extra section */
task('aws:create.index', [], createIndexAndUpload);

/* extra deps section */
task('pipeline:prepare', []);
