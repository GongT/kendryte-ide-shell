import * as VinylFile from 'vinyl';
import { debug, filter, gulp, gulpChokidar, gulpSrc, ISingleTask, log, plumber, task } from '../gulp';
import { nativePath } from '../misc/pathUtil';
import { createClean } from './cleanup';
import { createGlob, ISourceType, taskName } from './sourceType';

const TASK_COMPILE = 'compile';
const TASK_BUILD = 'build';
const TASK_WATCH = 'watch';

export function createCompileTask(
	category: string,
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
	isBuilt = false,
) {
	const process = taskConfig.task(taskConfig);
	if (taskConfig.clean) {
		dependencies.push(createClean(category, taskConfig, isBuilt));
	}
	return task(taskName(category + ':' + (isBuilt? TASK_BUILD : TASK_COMPILE), taskConfig), dependencies, () => {
		return process(
			gulpSrc(taskConfig.root, createGlob(taskConfig.sourceFiles))
				.pipe(filter(['**', '!**/node_modules/'])),
		)
			.pipe(gulp.dest(isBuilt? taskConfig.built : taskConfig.output));
	});
}

export function createWatchTask(
	category: string,
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const process = taskConfig.task(taskConfig);
	const watchName = taskName(category + ':' + TASK_WATCH, taskConfig);
	return task(watchName, [
		...dependencies,
		taskName(category + ':' + TASK_COMPILE, taskConfig),
	], () => {
		const p = gulpChokidar(taskConfig.root, createGlob(taskConfig.sourceFiles), (o) => {
			console.log('\x1Bc[%s] file has change: ', watchName, o.path);
			return o;
		}).pipe(plumber());
		return process(p)
			.pipe(plumber.stop())
			.pipe(gulp.dest(taskConfig.output))
			.pipe(debug({title: 'write:'}));
	});
}

export function createTypescriptWatch(
	category: string,
	taskConfig: ISourceType,
	dependencies: ISingleTask[],
) {
	const name = taskName(category + ':' + TASK_WATCH, taskConfig);
	const sources = createGlob(taskConfig.sourceFiles);
	const process = taskConfig.task(taskConfig);
	
	return task(name, [
		...dependencies,
		taskName(category + ':' + TASK_COMPILE, taskConfig),
	], () => {
		return gulpChokidar(taskConfig.root, sources, (o: VinylFile) => {
			log('\x1Bc[typescript] file has change: ', o.path);
			const rel = o.dirname.replace(taskConfig.root, '').replace(/^[\\\/]/, '');
			return process(
				gulp.src(o.path)
				    .pipe(plumber(logFn)),
			)
				.pipe(gulp.dest(nativePath(taskConfig.output, rel)))
				.pipe(debug({title: 'write:'}))
				
				.on('end', () => {
					log('compile complete.');
				});
		});
	});
}

function logFn() {
	console.log(arguments);
}
