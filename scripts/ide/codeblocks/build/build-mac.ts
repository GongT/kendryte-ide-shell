import { OutputStreamControl } from '@gongt/stillalive';
import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';
import { pipeCommandOut } from '../../../library/childprocess/complex';
import { getProductData } from '../../../library/misc/fsUtil';
import { gulpCommands } from '../gulp';

export async function macBuild(output: OutputStreamControl) {
	await pipeCommandOut(output, 'node', ...gulpCommands(), 'vscode-darwin-min');
	
	const appDirName = getProductData().nameLong;
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-darwin', appDirName + '.app');
	
	return compiledResult;
}