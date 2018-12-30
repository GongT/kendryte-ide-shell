import { myScriptSourcePath } from '../environment';
import { createCompileTask, createTypescriptWatch } from '../library/gulp/compileTaskBuild';
import { ISourceType } from '../library/gulp/sourceType';
import { createTypescriptTask } from '../library/gulp/typescript';
import { nativePath } from '../library/misc/pathUtil';

export const TASK_CATEGORY = 'scripts';

const outputPath = nativePath(__dirname, '..');
const tsTask: ISourceType = {
	root: myScriptSourcePath(outputPath),
	output: outputPath,
	sourceFiles: ['ts'],
	task: createTypescriptTask,
};

export const scriptsTask = createCompileTask(TASK_CATEGORY, tsTask, [], false);
export const scriptsWatchTask = createTypescriptWatch(TASK_CATEGORY, tsTask, []);

