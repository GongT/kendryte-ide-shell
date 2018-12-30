import { DEBUG_APP_ROOT, WORKSPACE_ROOT } from '../environment';
import { nativePath } from '../library/misc/pathUtil';

export const EXTENSIONS_SOURCE_CODE_PATH = nativePath(WORKSPACE_ROOT, 'extensions.kendryte');
export const EXTENSIONS_DIST_PATH_DEVELOP = nativePath(DEBUG_APP_ROOT, 'UserData/latest/extensions');
export const EXTENSIONS_DIST_PATH_RESULT = nativePath(WORKSPACE_ROOT, 'extensions-build');

let knownExtensions: string[];

export function listExtension(): string[] {
	if (!knownExtensions) {
		knownExtensions = require(nativePath(EXTENSIONS_SOURCE_CODE_PATH, 'package.json')).workspaces.filter((name: string) => {
			return name !== 'compiler';
		});
	}
	return knownExtensions;
}


