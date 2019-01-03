import { BUILD_DIST_SOURCE, DEBUG_APP_ROOT, isBuilding, SHELL_OUTPUT, SHELL_ROOT, WORKSPACE_ROOT } from '../environment';
import { jeditor, log, sass, sourcemaps, task, } from '../library/gulp';
import { createClean } from '../library/gulp/cleanup';
import { createCompileTask, createTypescriptWatch, createWatchTask } from '../library/gulp/compileTaskBuild';
import { ISourceType } from '../library/gulp/sourceType';
import { createTypescriptTask } from '../library/gulp/typescript';
import { ExS3 } from '../library/misc/awsUtil';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { getIDEJsonObjectKey, getIndexPageObjectKey } from '../library/releaseInfo/s3Keys';

const TASK_CATEGORY = 'shell';

const scssTask: ISourceType = {
	root: SHELL_ROOT,
	output: SHELL_OUTPUT,
	built: BUILD_DIST_SOURCE,
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
	root: SHELL_ROOT,
	output: SHELL_OUTPUT,
	built: BUILD_DIST_SOURCE,
	sourceFiles: ['ts'],
	task: createTypescriptTask,
};

const assetTask: ISourceType = {
	id: 'assets',
	root: SHELL_ROOT,
	output: SHELL_OUTPUT,
	built: BUILD_DIST_SOURCE,
	sourceFiles: ['html', 'svg', 'ico', 'icns'],
	task() {
		return (p: NodeJS.ReadWriteStream) => p;
	},
};

const channelJsonTask: ISourceType = {
	root: SHELL_ROOT,
	output: DEBUG_APP_ROOT,
	built: BUILD_DIST_SOURCE,
	sourceFiles: 'channel.json',
	task() {
		let channel: string;
		if (!process.env.CHANNEL && !isBuilding) {
			channel = 'sourcecode';
		} else {
			channel = getReleaseChannel();
		}
		return (p: NodeJS.ReadWriteStream) => {
			log(`Local building \x1B[38;5;9m${channel}\x1B[0m version.`);
			const modify: any = {
				channel: channel,
				registry: ExS3.instance().websiteUrl(getIDEJsonObjectKey(channel)),
				downloadPage: ExS3.instance().websiteUrl(getIndexPageObjectKey(channel)),
			};
			if (channel === 'sourcecode') {
				modify.sourceRoot = WORKSPACE_ROOT;
			}
			return p.pipe(jeditor(modify));
		};
	},
};

const packageJsonTask: ISourceType = {
	root: SHELL_ROOT,
	output: SHELL_OUTPUT,
	built: BUILD_DIST_SOURCE,
	sourceFiles: 'package.json',
	task() {
		return (p: NodeJS.ReadWriteStream) => p.pipe(jeditor({
			releaseTag: 'sourcecode',
		}));
	},
};

export const cleanupBuild = createClean(TASK_CATEGORY, tsTask, true);
export const cleanupBuildDevel = createClean(TASK_CATEGORY, tsTask, false);

export const productionTask = task(TASK_CATEGORY + ':build', [
	createCompileTask(TASK_CATEGORY, scssTask, [cleanupBuild], true),
	createCompileTask(TASK_CATEGORY, tsTask, [cleanupBuild], true),
	createCompileTask(TASK_CATEGORY, assetTask, [cleanupBuild], true),
]);

export const developmentTask = task(TASK_CATEGORY + ':develop', [
	createCompileTask(TASK_CATEGORY, scssTask, [cleanupBuildDevel], false),
	createCompileTask(TASK_CATEGORY, tsTask, [cleanupBuildDevel], false),
	createCompileTask(TASK_CATEGORY, assetTask, [cleanupBuildDevel], false),
	createCompileTask(TASK_CATEGORY, channelJsonTask, [cleanupBuildDevel], false),
	createCompileTask(TASK_CATEGORY, packageJsonTask, [cleanupBuildDevel], false),
]);

export const watchTask = task(TASK_CATEGORY + ':watch', [
	createWatchTask(TASK_CATEGORY, scssTask, []),
	createTypescriptWatch(TASK_CATEGORY, tsTask, []),
	createWatchTask(TASK_CATEGORY, assetTask, []),
	createWatchTask(TASK_CATEGORY, channelJsonTask, []),
	createWatchTask(TASK_CATEGORY, packageJsonTask, []),
]);
