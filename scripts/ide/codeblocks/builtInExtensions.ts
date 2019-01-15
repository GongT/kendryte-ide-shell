import { VSCODE_ROOT } from '../../environment';
import { simpleCommandOut } from '../../library/childprocess/complex';
import { chdir } from '../../library/misc/pathUtil';

export function builtInExtensions() {
	chdir(VSCODE_ROOT);
	console.error(':: Sync built-in extensions');
	return simpleCommandOut('node', 'build/lib/builtInExtensions.js');
}
