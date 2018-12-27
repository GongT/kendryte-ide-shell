import { join } from 'path';
import { BUILD_DIST_SOURCE, SHELL_ROOT } from '../environment';
import { gulp, jeditor, mergeStream, task, yarn } from '../library/gulp';
import { cleanBuildTask } from './cleanup';
import { productionTask } from './compile';
import { createReleaseTag } from './releaseTag';

function createYarnTask() {
	return task('build:yarn', [cleanBuildTask], function () {
		
		return mergeStream(
			gulp.src([SHELL_ROOT + 'yarn.lock'], {base: SHELL_ROOT}),
			gulp.src([SHELL_ROOT + 'package.json'], {base: SHELL_ROOT}).pipe(jeditor({releaseTag: createReleaseTag()})),
		)
			.pipe(gulp.dest(BUILD_DIST_SOURCE))
			.pipe(yarn({
				production: true,
				args: ['--ignore-scripts',
					'--no-progress',
					'--prefer-offline',
					'--no-default-rc',
					'--use-yarnrc',
					join(SHELL_ROOT, '.yarnrc')],
			}));
	});
}

export const releaseMakeTask = task('release:app', [
	createYarnTask(),
	productionTask,
]);