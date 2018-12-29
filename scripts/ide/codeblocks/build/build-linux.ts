import { copy } from 'fs-extra';
import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';
import { pipeCommandOut } from '../../../library/childprocess/complex';
import { gulpCommands } from '../gulp';

export async function linuxBuild() {
	await pipeCommandOut(process.stderr, 'node', ...gulpCommands(), 'vscode-linux-x64-min');
	
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-linux-x64');
	await copy('resources/linux/code.png', resolve(compiledResult, 'code.png'));
	
	return compiledResult;
}
