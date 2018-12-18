import { BUILD_DIST_SOURCE, BUILD_OUTPUT, BUILD_ROOT } from './root';
import { rimraf } from './vscode/uitl';

const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const typescript = require('gulp-typescript');
const sass = require('gulp-dart-sass');

sass.compiler = require('sass');

export function createTask(
	action: (p: NodeJS.ReadWriteStream) => NodeJS.ReadWriteStream,
	srcType: string[],
	deps: string[],
	isBuild = false,
) {
	const task = 'compile:' + (isBuild? 'build:' : '') + srcType.join('.');
	const srcGlob = srcType.length > 1? '{' + srcType.join(',') + '}' : srcType[0];
	gulp.task(task, deps, () => {
		return action(gulp.src('./src/**/*.' + srcGlob, {base: BUILD_ROOT + 'src'}))
			.pipe(gulp.dest(isBuild? BUILD_DIST_SOURCE : BUILD_OUTPUT));
	});
	return task;
}

export function cleanTask(isBuild = false) {
	const dir = isBuild? BUILD_DIST_SOURCE : BUILD_OUTPUT;
	const task = 'cleanup' + (isBuild? ':build' : '');
	gulp.task(task, rimraf(dir));
	return task;
}

export const scssTask = (p: NodeJS.ReadWriteStream) => {
	return p.pipe(sourcemaps.init({includeContent: true}))
	        .pipe(sass().on('error', sass.logError))
	        .pipe(sourcemaps.write('./'));
};

const tsProject = typescript.createProject('src/tsconfig.json', {
	declaration: false,
});
export const tsTask = (p: NodeJS.ReadWriteStream) => {
	return p.pipe(sourcemaps.init({includeContent: true}))
	        .pipe(tsProject())
	        .pipe(sourcemaps.write('./'));
};

export const assetTask = (p: NodeJS.ReadWriteStream) => {
	return p;
};
