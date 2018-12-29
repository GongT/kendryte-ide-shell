import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';
import { pipeCommandOut } from '../../../library/childprocess/complex';
import { gulpCommands } from '../gulp';

export async function windowsBuild() {
	await pipeCommandOut(process.stderr, 'node', ...gulpCommands(), 'vscode-win32-x64-min');
	await pipeCommandOut(process.stderr, 'node', ...gulpCommands(), 'vscode-win32-x64-copy-inno-updater');
	
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-win32-x64');
	
	return compiledResult;
}
