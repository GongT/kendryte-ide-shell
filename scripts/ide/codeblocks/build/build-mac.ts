import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';
import { simpleCommandOut } from '../../../library/childprocess/complex';
import { getProductData } from '../../../library/misc/fsUtil';
import { gulpCommands } from '../gulp';

export async function macBuild() {
	await simpleCommandOut('node', ...gulpCommands(), 'vscode-darwin-min');
	
	const appDirName = getProductData().nameLong;
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-darwin', appDirName + '.app');
	
	return compiledResult;
}
