import { BUILD_ARTIFACTS_DIR, BUILD_ASAR_DIR, BUILD_DIST_SOURCE, BUILD_DIST_TARGETS, SHELL_OUTPUT } from '../environment';
import { task } from '../library/gulp';
import { rimraf } from '../library/vscode/uitl';

export const cleanArtifactTask = task('cleanup:artifact', rimraf(BUILD_ARTIFACTS_DIR));
export const cleanDevelopTask = task('cleanup:dev-output', rimraf(SHELL_OUTPUT));
export const cleanBuildTask = task('cleanup:build', rimraf(BUILD_DIST_SOURCE));
export const cleanAsarTask = task('cleanup:asar', rimraf(BUILD_ASAR_DIR));
export const cleanReleaseTask = task('cleanup:release', rimraf(BUILD_DIST_TARGETS));
export const cleanup = task('cleanup', [
	cleanDevelopTask,
	cleanBuildTask,
	cleanAsarTask,
	cleanReleaseTask,
]);
