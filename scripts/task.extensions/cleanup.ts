import { task } from '../library/gulp';
import { nativePath } from '../library/misc/pathUtil';
import { rimraf } from '../library/vscode/uitl';
import { EXTENSIONS_DIST_PATH_DEVELOP, EXTENSIONS_DIST_PATH_RESULT, listExtension } from './path';

export const cleanupBuildTask = task('extensions:cleanup:build', rimraf(EXTENSIONS_DIST_PATH_RESULT));
export const cleanupDevelTask = task('extensions:cleanup:devel', async () => {
	for (const name of listExtension()) {
		await rimraf(nativePath(EXTENSIONS_DIST_PATH_DEVELOP, name));
	}
});
