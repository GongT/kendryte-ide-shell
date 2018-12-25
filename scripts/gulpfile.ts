import { copyDevelopChannelTask, developmentTask, watchTask } from './compile';
import { task } from './gulp';
import { compressTasks } from './release';

/* dev section */
task('default', [developmentTask, copyDevelopChannelTask]);
task('watch', [watchTask, copyDevelopChannelTask]);

/* build section */
task('build', [
	compressTasks,
]);
