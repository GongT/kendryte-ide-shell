import { VinylFile } from 'gulp-typescript/release/types';
import { BUILD_DIST_SOURCE, DEBUG_APP_ROOT, SHELL_OUTPUT, SHELL_ROOT, WORKSPACE_ROOT } from '../environment';
import {
	debug,
	gulp,
	gulpChokidar,
	gulpSrc,
	ISingleTask,
	jeditor,
	log,
	plumber,
	sass,
	sourcemaps,
	task,
	typescript,
} from '../library/gulp';
import { resolvePath } from '../library/misc/pathUtil';
import { cleanBuildTask, cleanDevelopTask } from './cleanup';

const TASK_COMPILE = 'develop:compile';
const TASK_WATCH = 'develop:watch';

interface ISourceType {
	id?: string;
	output?: string;
	sourceFiles: string[]|string;
	task(): (p: NodeJS.ReadWriteStream) => NodeJS.ReadWriteStream;
}

const scssTask: ISourceType = {
	sourceFiles: ['scss'],
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
	sourceFiles: ['ts'],
	task() {
		const tsProject = typescript.createProject(resolvePath(SHELL_ROOT, 'tsconfig.json'), {
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
	id: 'assets',
	sourceFiles: ['html', 'svg', 'ico', 'icns'],
	task() {
		return (p: NodeJS.ReadWriteStream) => p;
	},
};

const channelJsonTask: ISourceType = {
	output: DEBUG_APP_ROOT,
	sourceFiles: 'channel.json',
	task() {
		return (p: NodeJS.ReadWriteStream) => {
			const CHANNEL = process.env.CHANNEL || 'sourcecode';
			log(`Local building \x1B[38;5;9m${CHANNEL}\x1B[0m version.`);
			const modify: any = {
				channel: CHANNEL,
			};
			if (CHANNEL === 'sourcecode') {
				modify.sourceRoot = WORKSPACE_ROOT;
			}
			return p.pipe(jeditor(modify));
		};
	},
};

const packageJsonTask: ISourceType = {
	sourceFiles: 'package.json',
	task() {
		return (p: NodeJS.ReadWriteStream) => p.pipe(jeditor({
			releaseTag: 'sourcecode',
		}));
	},
};

function taskName(prefix: string, obj: ISourceType) {
	if (obj.id) {
		return prefix + ':' + obj.id;
	} else if (Array.isArray(obj.sourceFiles)) {
		return prefix + ':' + obj.sourceFiles.join('.');
	} else {
		return prefix + ':' + obj.sourceFiles;
	}
}

function createGlob(src: string[]|string) {
	if (Array.isArray(src)) {
		const srcGlob = src.length > 1? '{' + src.join(',') + '}' : src[0];
		return '**/*.' + srcGlob;
	} else {
		return src;
	}
}

function createCompileTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
	isBuild = false,
) {
	const process = taskConfig.task();
	return task(taskName(isBuild? 'build:compile' : TASK_COMPILE, taskConfig), dependencies, () => {
		return process(gulpSrc(SHELL_ROOT, createGlob(taskConfig.sourceFiles)))
			.pipe(gulp.dest(isBuild? BUILD_DIST_SOURCE : taskConfig.output || SHELL_OUTPUT));
	});
}

function createWatchTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const process = taskConfig.task();
	const watchName = taskName(TASK_WATCH, taskConfig);
	return task(watchName, [
		...dependencies,
		taskName(TASK_COMPILE, taskConfig),
	], () => {
		const p = gulpChokidar(SHELL_ROOT, createGlob(taskConfig.sourceFiles), (o) => {
			console.log('\x1Bc[%s] file has change: ', watchName, o.path);
			return o;
		}).pipe(plumber());
		return process(p)
			.pipe(plumber.stop())
			.pipe(gulp.dest(taskConfig.output || SHELL_OUTPUT))
			.pipe(debug({title: 'write:'}));
	});
}

function createWatchCallbackTask(
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const process = taskConfig.task();
	const watchName = taskName(TASK_WATCH, taskConfig);
	return task(watchName, [
		...dependencies,
		taskName(TASK_COMPILE, taskConfig),
	], () => {
		const sources = createGlob(taskConfig.sourceFiles);
		return gulpChokidar(SHELL_ROOT, sources, (o: VinylFile) => {
			console.log('\x1Bc[%s] file has change: ', watchName, o.path);
			const rel = o.dirname.replace(SHELL_ROOT, '');
			
			const p = gulp.src(o.path)
			              .pipe(plumber(() => {
			              }));
			return process(p).pipe(plumber.stop())
			                 .pipe(gulp.dest(SHELL_OUTPUT + rel))
			                 .pipe(debug({title: 'write:'}))
			                 .on('end', () => {
				                 console.log('compile complete.');
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
	createCompileTask(channelJsonTask, [cleanDevelopTask], false),
	createCompileTask(packageJsonTask, [cleanDevelopTask], false),
]);

export const watchTask = task(TASK_WATCH, [
	createWatchTask(scssTask, [cleanDevelopTask]),
	createWatchCallbackTask(tsTask, [cleanDevelopTask]),
	createWatchTask(assetTask, [cleanDevelopTask]),
	createWatchTask(channelJsonTask, [cleanDevelopTask]),
	createWatchTask(packageJsonTask, [cleanDevelopTask]),
]);

