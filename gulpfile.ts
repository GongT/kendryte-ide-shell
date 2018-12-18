import { assetTask, cleanTask, createTask, scssTask, tsTask } from './scripts/build-source';
import { createYarnTask } from './scripts/electron';

const gulp = require('gulp');
const watch = require('gulp-watch');

const cleanDev = [cleanTask(false)];
const srcDev = [
	createTask(scssTask, ['scss'], cleanDev, false),
	createTask(tsTask, ['ts'], cleanDev, false),
	createTask(assetTask, ['html', 'svg', 'ico', 'icns'], cleanDev, false),
];

/* dev section */
gulp.task('default', srcDev);

/* build section */
gulp.task('build', [createYarnTask()]);
