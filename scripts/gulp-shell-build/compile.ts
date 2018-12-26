import { VinylFile } from 'gulp-typescript/release/types';
import { BUILD_DIST_SOURCE, BUILD_ROOT, SHELL_OUTPUT, SHELL_ROOT, SHELL_SOURCE } from '../library/environment';
import { gulp, ISingleTask, jeditor, plumber, sass, sourcemaps, task, typescript, watch } from '../library/gulp';
import { cleanBuildTask, cleanDevelopTask } from './cleanup';

const TASK_COMPILE = 'develop:compile';
const TASK_WATCH = 'develop:watch';

interface ISourceType {
	sourceTypes: string[];
	task(): (p: NodeJS.ReadWriteStream) => NodeJS.ReadWriteStream;
}

const scssTask: ISourceType = {
	sourceTypes: ['scss'],
	task() {
		const compile = sass().on('error', sass.logError);
		return (p: NodeJS.ReadWriteStream) => {
			return p.pipe(sourcemaps.init({includeContent: true}))
			        .pipe(compile)
			        .pipe(sourcemaps.write(''));
		};
	},
};

const tsTask: ISourceType = {
	sourceTypes: ['ts'],
	task() {
		const tsProject = typescript.createProject(SHELL_SOURCE + 'tsconfig.json', {
			declaration: false,
			rootDir: '.',
		});
		return (p: NodeJS.ReadWriteStream) => {
			return p.pipe(sourcemaps.init({includeContent: true}))
			        .pipe(tsProject())
			        .pipe(sourcemaps.write(''));
		};
	},
};

const assetTask: ISourceType = {
	sourceTypes: ['html', 'svg', 'ico', 'icns'],
	task() {
		return (p: NodeJS.ReadWriteStream) => p;
	},
};

function taskName(prefix: string, src: string[]) {
	return prefix + ':' + src.join('.');
}

function createGlob(src: string[]) {
	const srcGlob = src.length > 1? '{' + src.join(',') + '}' : src[0];
	return SHELL_SOURCE + '**/*.' + srcGlob;
}

function createCompileTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
	isBuild = false,
) {
	const process = taskConfig.task();
	return task(taskName(isBuild? 'build:compile' : TASK_COMPILE, taskConfig.sourceTypes), dependencies, () => {
		return process(gulp.src(createGlob(taskConfig.sourceTypes), {base: SHELL_SOURCE}))
			.pipe(gulp.dest(isBuild? BUILD_DIST_SOURCE : SHELL_OUTPUT));
	});
}

function createWatchTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const process = taskConfig.task();
	return task(
		taskName(TASK_WATCH, taskConfig.sourceTypes),
		[
			...dependencies,
			taskName(TASK_COMPILE, taskConfig.sourceTypes),
		],
		() => {
			const p = watch(createGlob(taskConfig.sourceTypes), {base: SHELL_SOURCE, ignoreInitial: false})
				.pipe(plumber());
			return process(p)
				.pipe(plumber.stop())
				.pipe(gulp.dest(SHELL_OUTPUT));
		});
}

function createWatchCallbackTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const process = taskConfig.task();
	return task(taskName(TASK_WATCH, taskConfig.sourceTypes),
		[
			...dependencies,
			taskName(TASK_COMPILE, taskConfig.sourceTypes),
		],
		() => {
			const sources = createGlob(taskConfig.sourceTypes);
			return watch(sources, {base: SHELL_SOURCE}, (o: VinylFile) => {
				console.log('\x1Bcfile has change: ', o.path);
				const rel = o.dirname.replace(SHELL_SOURCE, '');
				
				const p = gulp.src(o.path)
				              .pipe(plumber(() => {
				              }));
				return process(p).pipe(plumber.stop())
				                 .pipe(gulp.dest(SHELL_OUTPUT + rel))
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
	return gulp.src(SHELL_ROOT + 'channel.json').pipe(jeditor({
		channel: 'sourcecode',
		sourceRoot: process.env.SOURCE_CODE_DIR || 'kendryte-ide',
	})).pipe(gulp.dest(BUILD_ROOT + 'DebugContents'));
});

export const watchTask = task(TASK_WATCH, [
	createWatchTask(scssTask, [cleanDevelopTask]),
	createWatchCallbackTask(tsTask, [cleanDevelopTask]),
	createWatchTask(assetTask, [cleanDevelopTask]),
]);
