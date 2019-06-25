import { ensureSymlink, pathExists } from 'fs-extra';
import { ISingleTask, log, task } from '../library/gulp';
import { createCompileTask, createTypescriptWatch, createWatchTask } from '../library/gulp/compileTaskBuild';
import { createTypescriptTaskWithRename } from '../library/gulp/typescript';
import { isExistsSync } from '../library/misc/fsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { cleanupBuildTask, cleanupDevelTask } from './cleanup';
import { EXTENSIONS_DIST_PATH_DEVELOP, EXTENSIONS_DIST_PATH_RESULT, EXTENSIONS_SOURCE_CODE_PATH, listExtension } from './path';

const TASK_CATEGORY = 'extensions';

export const extensionsBuildTask = task(TASK_CATEGORY + ':build', createAll(createBuildTask));
export const extensionsTask = task(TASK_CATEGORY + ':develop', createAll(createDevelTask));
export const extensionsWatchTask = task(TASK_CATEGORY + ':watch', createAll(createDevelWatchTask));

export const createExtensionsNodeModulesTask = task(TASK_CATEGORY + ':node_modules', async () => {
	await ensureSymlink(nativePath(EXTENSIONS_SOURCE_CODE_PATH, 'node_modules'), nativePath(EXTENSIONS_DIST_PATH_DEVELOP, 'node_modules'));
	for (const item of listExtension()) {
		const src = nativePath(EXTENSIONS_SOURCE_CODE_PATH, item, 'node_modules');
		if (await pathExists(src)) {
			await ensureSymlink(src, nativePath(EXTENSIONS_DIST_PATH_DEVELOP, item, 'node_modules'));
		}
	}
});

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
	let root: string = '/path/not/exists';
	if (isExistsSync(nativePath(EXTENSIONS_SOURCE_CODE_PATH, name, 'src/tsconfig.json'))) {
		root = nativePath(EXTENSIONS_SOURCE_CODE_PATH, name, 'src');
	} else if (isExistsSync(nativePath(EXTENSIONS_SOURCE_CODE_PATH, name, 'tsconfig.json'))) {
		root = nativePath(EXTENSIONS_SOURCE_CODE_PATH, name);
	} else {
		log(`Cannot find tsconfig.json for extension "${name}"`);
	}
	return {
		root,
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
		createCompileTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), [cleanupBuildTask], true),
		createCompileTask(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), [cleanupBuildTask], true),
	]);
}

function createDevelTask(name: string) {
	return task(TASK_CATEGORY + ':' + name + ':compile', [
		createCompileTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), [cleanupDevelTask], false),
		createCompileTask(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), [cleanupDevelTask], false),
	]);
}

function createDevelWatchTask(name: string) {
	return task(TASK_CATEGORY + ':' + name + ':watch', [
		createWatchTask(TASK_CATEGORY + ':' + name, wrapJsonTask(name), [cleanupDevelTask]),
		createTypescriptWatch(TASK_CATEGORY + ':' + name, wrapTypescriptTask(name), [cleanupDevelTask]),
	]);
}
