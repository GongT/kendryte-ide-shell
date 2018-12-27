import { join } from 'path';
import { task } from '../library/gulp';
import { BUILD_DIST_ROOT, BUILD_DIST_SOURCE, SHELL_OUTPUT } from '../environment';
import { rimraf } from '../vscode/uitl';

export const cleanDevelopTask = task('cleanup:dev-output', rimraf(SHELL_OUTPUT));
export const cleanBuildTask = task('cleanup:build', rimraf(BUILD_DIST_SOURCE));
export const cleanAsarTask = task('cleanup:asar', rimraf(join(BUILD_DIST_ROOT, 'resources')));
export const cleanReleaseTask = task('cleanup:release', rimraf(join(BUILD_DIST_ROOT, 'release')));
export const cleanup = task('cleanup', [
	cleanDevelopTask,
	cleanBuildTask,
	cleanAsarTask,
	cleanReleaseTask,
]);
