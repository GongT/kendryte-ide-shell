import { task } from '../library/gulp';
import { nativePath } from '../library/misc/pathUtil';
import { rimraf } from '../library/vscode/uitl';
import { EXTENSIONS_DIST_PATH_DEVELOP, EXTENSIONS_DIST_PATH_RESULT, listExtension } from './path';

export const cleanupExtensionDevTask = task('cleanup:extensions', async () => {
	for (const name of listExtension()) {
		await rimraf(nativePath(EXTENSIONS_DIST_PATH_DEVELOP, name));
	}
});
export const cleanupExtensionBuildTask = task('cleanup:extensions:build', async () => {
	for (const name of listExtension()) {
		await rimraf(nativePath(EXTENSIONS_DIST_PATH_RESULT, name));
	}
});
