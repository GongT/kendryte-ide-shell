import { join } from 'path';
import { SHELL_ROOT } from '../environment';
import { gulp, gulpSrc, mergeStream, task, yarn } from '../library/gulp';
import { nativePath } from '../library/misc/pathUtil';
import { buildTaskName, extensionsBuildTask } from './gulpfile';
import { EXTENSIONS_DIST_PATH_RESULT, EXTENSIONS_SOURCE_CODE_PATH, listExtension } from './path';

const taskList = listExtension().map((name: string) => {
	return task('extensions:package:' + name, [buildTaskName(name)], () => {
		return mergeStream(
			gulpSrc(EXTENSIONS_SOURCE_CODE_PATH, 'yarn.lock'),
			gulpSrc(nativePath(EXTENSIONS_SOURCE_CODE_PATH, name), 'package.json'),
		)
			.pipe(gulp.dest(nativePath(EXTENSIONS_DIST_PATH_RESULT, name)))
			.pipe(yarn({
				production: true,
				args: [
					'--ignore-scripts',
					'--no-progress',
					'--prefer-offline',
					'--no-default-rc',
					'--use-yarnrc',
					join(SHELL_ROOT, '.yarnrc'),
				],
			}));
	});
});

export const extensionsPackageTask = task('extensions', [
	extensionsBuildTask,
	task('extensions:package', taskList),
]);
