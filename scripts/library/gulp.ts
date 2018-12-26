import { TaskFunc } from 'orchestrator';
import { join } from 'path';
import * as Q from 'q';
import * as stream from 'stream';
import { BUILD_DIST_TARGETS } from './environment';

export const gulp = require('gulp');
export const watch = require('gulp-watch');
export const sourcemaps = require('gulp-sourcemaps');
export const typescript = require('gulp-typescript');
export const sass = require('gulp-dart-sass');
sass.compiler = require('sass');
export const jeditor = require('gulp-json-editor');
export const plumber = require('gulp-plumber');
export const yarn = require('gulp-yarn');
export const download = require('gulp-download2');
export const filter = require('gulp-filter');
export const debug = require('gulp-debug');
export const zip = require('gulp-vinyl-zip');
export const es = require('event-stream');
export const rename = require('gulp-rename');
export const run = require('gulp-run-command').default;
export const aws = require('gulp-aws');
export const log = require('fancy-log');

export type ISingleTask = string;
export type ITaskPlatform = ISingleTask&IPlatformMap<ISingleTask>;
export type ITask = ISingleTask|ITaskPlatform;

export interface ITaskCreator {
	(name: string, fn: TaskFunc): ISingleTask;
	(name: string, deps: ITask[], fn?: TaskFunc): ISingleTask;
}

export interface IPlatformMap<T> {
	win32: T;
	linux: T;
	darwin: T;
}

export interface IPlatformTaskCreator extends ITaskCreator, IPlatformMap<ITaskCreator> {
}

function platformTaskCreator(platform?: IPlatformTypes): ITaskCreator {
	return (name: string, deps: TaskFunc|ITask[], fn?: TaskFunc): ISingleTask => {
		// console.error(deps);
		if (Array.isArray(deps)) {
			let parsedDeps: ITask[] = [];
			deps.forEach((obj, i) => {
				if (platform && Object.prototype.hasOwnProperty.call(obj, platform)) {
					// console.error(i, 'platform', platform);
					parsedDeps.push((obj as IPlatformMap<ISingleTask>)[platform]);
				} else {
					// console.error(i, 'string', obj);
					parsedDeps.push('' + obj); // ISingleTask
				}
			});
			deps = parsedDeps;
		} else {
			fn = deps;
			deps = [];
		}
		const taskName = platform? name + ':' + platform : name;
		// console.error('task %s, dependecy [%s]\n\n', taskName, deps.join(', '));
		gulp.task(taskName, deps, fn);
		return taskName;
	};
}

const taskCreator: IPlatformTaskCreator = Object.assign(platformTaskCreator(), {
	win32: platformTaskCreator('win32'),
	linux: platformTaskCreator('linux'),
	darwin: platformTaskCreator('darwin'),
});

export const task: IPlatformTaskCreator = taskCreator;

export const platforms: IPlatformTypes[] = ['win32', 'darwin', 'linux'];
export type IPlatformTypes = keyof IPlatformMap<any>;

export interface IMyTaskFunc {
	(platform: IPlatformTypes, root: string): Q.Promise<any>|stream.Stream|any;
}

export function everyPlatform(task: string, cb: IMyTaskFunc): ITask;
export function everyPlatform(task: string, deps: ITask[], cb?: IMyTaskFunc): ITask;
export function everyPlatform(task: string, deps: ITask[]|IMyTaskFunc, cb?: IMyTaskFunc): ITask {
	const ret: IPlatformMap<ITask> = {} as any;
	for (const platform of platforms) {
		const currentPlatformDir = join(process.cwd(), BUILD_DIST_TARGETS, platform);
		if (!cb) {
			cb = deps as IMyTaskFunc;
			deps = [];
		}
		ret[platform] = taskCreator[platform](task, deps as ISingleTask[], () => {
			return cb(platform, currentPlatformDir);
		});
	}
	
	taskCreator(task, Array.from(Object.values(ret)));
	
	return Object.assign(new String(task), ret) as any;
}
