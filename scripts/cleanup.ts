import { resolve } from 'path';
import { task } from './gulp';
import { BUILD_DIST_ROOT, BUILD_DIST_SOURCE, BUILD_OUTPUT } from './root';
import { rimraf } from './vscode/uitl';

export const cleanDevelopTask = task('cleanup:dev-output', rimraf(BUILD_OUTPUT));
export const cleanBuildTask = task('cleanup:build', rimraf(BUILD_DIST_SOURCE));
export const cleanAsarTask = task('cleanup:asar', rimraf(resolve(BUILD_DIST_ROOT, 'resources')));
export const cleanReleaseTask = task('cleanup:release', rimraf(resolve(BUILD_DIST_ROOT, 'release')));
export const cleanup = task('cleanup', [
	cleanDevelopTask,
	cleanBuildTask,
	cleanAsarTask,
	cleanReleaseTask,
]);
