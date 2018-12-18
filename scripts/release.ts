import { resolve } from 'path';
import { assetTask, cleanTask, createTask, scssTask, tsTask } from './build-source';
import { BUILD_DIST_SOURCE, BUILD_ROOT } from './root';

const yarn = require('gulp-yarn');
const gulp = require('gulp');

const cleanProd = [cleanTask(true)];
const srcProd = [
	createTask(scssTask, ['scss'], cleanProd, true),
	createTask(tsTask, ['ts'], cleanProd, true),
	createTask(assetTask, ['html', 'svg', 'ico', 'icns'], cleanProd, true),
];

gulp.task('build:source', srcProd);
gulp.task('build:yarn', cleanProd, function () {
	return gulp.src(['package.json', 'yarn.lock'], {base: BUILD_ROOT})
	           .pipe(gulp.dest(BUILD_DIST_SOURCE))
	           .pipe(yarn({
		           production: true,
		           args: ['--prefer-offline', '--no-default-rc', '--use-yarnrc', resolve(BUILD_ROOT, '.yarnrc')],
	           }));
});

export const TASK_BUILD = 'build:app';
gulp.task(TASK_BUILD, [
	'build:source',
	'build:yarn',
]);
