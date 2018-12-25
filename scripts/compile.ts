import { VinylFile } from 'gulp-typescript/release/types';
import { cleanBuildTask, cleanDevelopTask } from './cleanup';
import { gulp, ISingleTask, jeditor, plumber, sass, sourcemaps, task, typescript, watch } from './gulp';
import { BUILD_DIST_SOURCE, BUILD_OUTPUT, BUILD_ROOT } from './root';

const TASK_COMPILE = 'develop:compile';
const TASK_WATCH = 'develop:watch';

interface ISourceType {
	sourceTypes: string[];
	task(p: NodeJS.ReadWriteStream): NodeJS.ReadWriteStream;
}

const scssTask: ISourceType = {
	sourceTypes: ['scss'],
	task(p: NodeJS.ReadWriteStream) {
		return p.pipe(sourcemaps.init({includeContent: true}))
		        .pipe(sass().on('error', sass.logError))
		        .pipe(sourcemaps.write(''));
	},
};

const tsTask: ISourceType = {
	sourceTypes: ['ts'],
	task(p: NodeJS.ReadWriteStream) {
		const tsProject = typescript.createProject('src/tsconfig.json', {
			declaration: false,
		});
		return p.pipe(sourcemaps.init({includeContent: true}))
		        .pipe(tsProject())
		        .pipe(sourcemaps.write(''));
	},
};

const assetTask: ISourceType = {
	sourceTypes: ['html', 'svg', 'ico', 'icns'],
	task(p: NodeJS.ReadWriteStream) {
		return p;
	},
};

function taskName(prefix: string, src: string[]) {
	return prefix + ':' + src.join('.');
}

function createGlob(src: string[]) {
	const srcGlob = src.length > 1? '{' + src.join(',') + '}' : src[0];
	return './src/**/*.' + srcGlob;
}

function createCompileTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
	isBuild = false,
) {
	return task(taskName(isBuild? 'build:compile' : TASK_COMPILE, taskConfig.sourceTypes), dependencies, () => {
		return taskConfig.task(gulp.src(createGlob(taskConfig.sourceTypes), {base: BUILD_ROOT + 'src'}))
		                 .pipe(gulp.dest(isBuild? BUILD_DIST_SOURCE : BUILD_OUTPUT));
	});
}

function createWatchTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	return task(
		taskName(TASK_WATCH, taskConfig.sourceTypes),
		[
			...dependencies,
			taskName(TASK_COMPILE, taskConfig.sourceTypes),
		],
		() => {
			const p = watch(createGlob(taskConfig.sourceTypes), {base: BUILD_ROOT + 'src', ignoreInitial: false})
				.pipe(plumber());
			return taskConfig.task(p)
			                 .pipe(plumber.stop())
			                 .pipe(gulp.dest(BUILD_OUTPUT));
		});
}

function createWatchCallbackTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	return task(taskName(TASK_WATCH, taskConfig.sourceTypes),
		[
			...dependencies,
			taskName(TASK_COMPILE, taskConfig.sourceTypes),
		],
		() => {
			const sources = createGlob(taskConfig.sourceTypes);
			return watch(sources, {base: BUILD_ROOT + 'src'}, (o: VinylFile) => {
				console.log('\x1Bcfile has change: ', o.path);
				const p = gulp.src(o.path)
				              .pipe(plumber(() => {}));
				return taskConfig.task(p)
				                 .pipe(plumber.stop())
				                 .pipe(gulp.dest(BUILD_OUTPUT))
				                 .on('end', () => {
					                 console.log('complile complete.');
				                 });
			});
		});
}

export const productionTask = task('build:compile', [
	createCompileTask(scssTask, [cleanBuildTask], true),
	createCompileTask(tsTask, [cleanBuildTask], true),
	createCompileTask(assetTask, [cleanBuildTask], true),
]);

export const developmentTask = task(TASK_COMPILE, [
	createCompileTask(scssTask, [cleanDevelopTask], false),
	createCompileTask(tsTask, [cleanDevelopTask], false),
	createCompileTask(assetTask, [cleanDevelopTask], false),
]);

export const copyDevelopChannelTask = task('develop:channel.json', [cleanDevelopTask], () => {
	return gulp.src(BUILD_ROOT + 'channel.json').pipe(jeditor({
		channel: 'sourcecode',
		sourceRoot: '../kendryte-ide',
	})).pipe(gulp.dest(BUILD_ROOT + 'DebugContents'));
});

export const watchTask = task(TASK_WATCH, [
	createWatchTask(scssTask, [cleanDevelopTask]),
	createWatchCallbackTask(tsTask, [cleanDevelopTask]),
	createWatchTask(assetTask, [cleanDevelopTask]),
]);
