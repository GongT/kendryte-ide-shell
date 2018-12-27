import { TaskFunc } from 'orchestrator';
import { join } from 'path';
import * as Q from 'q';
import * as stream from 'stream';
import { Readable, Transform } from 'stream';
import * as File from 'vinyl';
import { BUILD_DIST_TARGETS } from '../environment';

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
export const rename = require('gulp-rename');
export const run = require('gulp-run-command').default;
export const aws = require('gulp-aws');
export const log = require('fancy-log');
export const remoteSrc = require('gulp-remote-src');
export const through2Concurrent = require('through2-concurrent');
const PluginError = require('plugin-error');
const _mergeStream = require('merge-stream');

export function mergeStream(...streams: NodeJS.ReadableStream[]) {
	const stream = _mergeStream(...streams);
	return stream.isEmpty()? null : stream;
}

export function pluginError(plugin: string, originalError: string|Error) {
	if (originalError instanceof PluginError) {
		return originalError;
	} else {
		return new PluginError(plugin, originalError);
	}
}

export function limitSpeedTransform(num: number, transform: (this: Readable, obj: any) => Promise<void>) {
	return through2Concurrent.obj(
		{maxConcurrency: num},
		function (this: any, chunk: any, enc: any, callback: Function) {
			const reject = (e: Error) => {
				callback(pluginError('limit-speed', e));
			};
			
			Promise.resolve().then(transform.bind(this, chunk)).then(() => {
				callback();
			}, reject);
		});
}

class SuperVerboseLog extends Transform {
	constructor() {
		super({objectMode: true});
	}
	
	_transform(chunk: File, encoding: string, callback: Function) {
		log.warn((chunk.contents as any).toString(encoding));
		this.push(chunk);
		callback();
	}
}

export function printFileContent(): Transform {
	return new SuperVerboseLog();
}

export const VinylFile: typeof File = File;

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

export function createVinylFile(path: string, base: string, content: NodeJS.ReadableStream|string|Buffer): File {
	if (typeof content === 'string') {
		content = Buffer.from(content, 'utf8');
	}
	return new VinylFile({
		path,
		base,
		contents: content,
	});
}

export function filesToStream(...files: File[]) {
	const pass = new Readable({objectMode: true});
	for (const f of files) {
		pass.push(f);
	}
	pass.push(null);
	return pass;
}
