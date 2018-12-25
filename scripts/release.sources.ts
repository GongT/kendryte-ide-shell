import { resolve } from 'path';
import { cleanBuildTask } from './cleanup';
import { productionTask } from './compile';
import { es, gulp, jeditor, task, yarn } from './gulp';
import { createReleaseTag } from './releaseTag';
import { BUILD_DIST_SOURCE, BUILD_ROOT } from './root';

function createYarnTask() {
	return task('build:yarn', [cleanBuildTask], function () {
		
		return es.merge(
			gulp.src(['yarn.lock'], {base: BUILD_ROOT}),
			gulp.src(['package.json'], {base: BUILD_ROOT}).pipe(jeditor({releaseTag: createReleaseTag()})),
		)
		         .pipe(gulp.dest(BUILD_DIST_SOURCE))
		         .pipe(yarn({
			         production: true,
			         args: ['--ignore-scripts', '--prefer-offline', '--no-default-rc', '--use-yarnrc', resolve(BUILD_ROOT, '.yarnrc')],
		         }));
	});
}

export const releaseMakeTask = task('release:app', [
	createYarnTask(),
	productionTask,
]);