import { assetTask, cleanTask, createTask, scssTask, tsTask } from './scripts/build-source';
import { createYarnTask } from './scripts/electron';

const jeditor = require('gulp-json-editor');

const gulp = require('gulp');
const watch = require('gulp-watch');

const cleanDev = [cleanTask(false)];
const srcDev = [
	createTask(scssTask, ['scss'], cleanDev, false),
	createTask(tsTask, ['ts'], cleanDev, false),
	createTask(assetTask, ['html', 'svg', 'ico', 'icns'], cleanDev, false),
];

/* dev section */
gulp.task('default', srcDev, () => {
	return gulp.src('./channel.json').pipe(jeditor({
		channel: 'sourcecode',
		sourceRoot: '../kendryte-ide',
	})).pipe(gulp.dest('./DebugContents'));
});

/* build section */
gulp.task('build', [createYarnTask()]);
