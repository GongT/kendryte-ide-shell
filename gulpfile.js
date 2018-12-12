const gulp = require('gulp');
const Fiber = require('fibers');
const sourcemaps = require('gulp-sourcemaps');
const typescript = require('gulp-typescript');
const sass = require('gulp-dart-sass');
const watch = require('gulp-watch');

sass.compiler = require('sass');

function createTask(task, src, action) {
	gulp.task(task, () => {
		return gulp.src(src, () => {
			return action(gulp.src(src, {base: './src/'}));
		});
	});
	return {
		task,
		src,
	};
}

const scssTask = createTask('sass', './src/**/*.scss', function (p) {
	return p
		.pipe(sourcemaps.init())
		.pipe(sass({fiber: Fiber}).on('error', sass.logError))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('./dist/'));
});

const assetTask = createTask('copy-html', './src/**/*.{html,svg}', function (p) {
	return p
		.pipe(gulp.dest('./dist/'));
});

const tsProject = typescript.createProject('src/tsconfig.json', {
	declaration: false,
});
const tsTask = createTask('tsc', 'src/**/*.ts', function (p) {
	return p
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest('dist'));
});

gulp.task('default', [scssTask.task, assetTask.task, tsTask.task]);

function watchTask({task, src}) {
	const name = task + ':watch';
	gulp.task(name, [task], () => {
		gulp.watch(src, [task]);
	});
	return name;
}

gulp.task('watch', [
	watchTask(scssTask),
	watchTask(assetTask),
]);
