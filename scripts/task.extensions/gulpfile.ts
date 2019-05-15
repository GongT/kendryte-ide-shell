import { ISingleTask, task } from '../library/gulp';
import { createCompileTask, createTypescriptWatch, createWatchTask } from '../library/gulp/compileTaskBuild';
import { createTypescriptTaskWithRename } from '../library/gulp/typescript';
import { nativePath } from '../library/misc/pathUtil';
import { EXTENSIONS_DIST_PATH_DEVELOP, EXTENSIONS_DIST_PATH_RESULT, EXTENSIONS_SOURCE_CODE_PATH, listExtension } from './path';

const TASK_CATEGORY = 'extensions';

export const extensionsBuildTask = task(TASK_CATEGORY + ':build', createAll(createBuildTask));
export const extensionsTask = task(TASK_CATEGORY + ':develop', createAll(createDevelTask));
export const extensionsWatchTask = task(TASK_CATEGORY + ':watch', createAll(createDevelWatchTask));

function createAll(createFn: (name: string) => ISingleTask) {
	return listExtension().map(createFn);
}

function wrapJsonTask(name: string) {
	return {
		id: 'assets',
		root: nativePath(EXTENSIONS_SOURCE_CODE_PATH, name),
		output: nativePath(EXTENSIONS_DIST_PATH_DEVELOP, name),
		built: nativePath(EXTENSIONS_DIST_PATH_RESULT, name),
		sourceFiles: ['json'],
		task() {
			return (p: NodeJS.ReadWriteStream) => p;
		},
	};
}

function wrapTypescriptTask(name: string) {
	return {
		root: nativePath(EXTENSIONS_SOURCE_CODE_PATH, name),
		output: nativePath(EXTENSIONS_DIST_PATH_DEVELOP, name),
		built: nativePath(EXTENSIONS_DIST_PATH_RESULT, name),
		sourceFiles: ['ts'],
		task: createTypescriptTaskWithRename,
	};
}

export function buildTaskName(name: string) {
	return TASK_CATEGORY + ':' + name + ':build';
}

function createBuildTask(name: string) {
	return task(buildTaskName(name), [
		createCompileTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), [], true),
		createCompileTask(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), [], true),
	]);
}

function createDevelTask(name: string) {
	return task(TASK_CATEGORY + ':' + name + ':compile', [
		createCompileTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), [], false),
		createCompileTask(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), [], false),
	]);
}

function createDevelWatchTask(name: string) {
	return task(TASK_CATEGORY + ':' + name + ':watch', [
		createWatchTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), []),
		createTypescriptWatch(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), []),
	]);
}
