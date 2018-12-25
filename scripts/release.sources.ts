import { resolve } from 'path';
import { cleanBuildTask } from './cleanup';
import { productionTask } from './compile';
import { gulp, task, yarn } from './gulp';
import { BUILD_DIST_SOURCE, BUILD_ROOT } from './root';

function createYarnTask() {
	return task('build:yarn', [cleanBuildTask], function () {
		return gulp.src(['package.json', 'yarn.lock'], {base: BUILD_ROOT})
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