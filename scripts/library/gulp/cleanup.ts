import { BUILD_ARTIFACTS_DIR, BUILD_ASAR_DIR, BUILD_DIST_TARGETS } from '../../environment';
import { task } from '../gulp';
import { rimraf } from '../vscode/uitl';
import { ISourceType, taskName } from './sourceType';

export const cleanArtifactTask = task('cleanup:artifact', rimraf(BUILD_ARTIFACTS_DIR));
export const cleanAsarTask = task('cleanup:asar', rimraf(BUILD_ASAR_DIR));
export const cleanReleaseTask = task('cleanup:release', rimraf(BUILD_DIST_TARGETS));

export function createClean(category: string, taskConfig: ISourceType, isBuilt: boolean) {
	const name = taskName(`${category}:clean${isBuilt? ':build' : 'develop'}`, taskConfig);
	const dir = isBuilt? taskConfig.built : taskConfig.output;
	return task(name, rimraf(dir));
}
