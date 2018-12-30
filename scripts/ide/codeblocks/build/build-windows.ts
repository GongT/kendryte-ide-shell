import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';
import { simpleCommandOut } from '../../../library/childprocess/complex';
import { gulpCommands } from '../gulp';

export async function windowsBuild() {
	await simpleCommandOut('node', ...gulpCommands(), 'vscode-win32-x64-min');
	await simpleCommandOut('node', ...gulpCommands(), 'vscode-win32-x64-copy-inno-updater');
	
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-win32-x64');
	
	return compiledResult;
}
