import { OutputStreamControl } from '@gongt/stillalive';
import { resolve } from 'path';
import { MY_SCRIPT_ROOT } from '../../environment';
import { pipeCommandOut } from '../../library/childprocess/complex';
import { chdir } from '../../library/misc/pathUtil';
import { gulpCommands } from '../codeblocks/gulp';
import { removeDirectory } from '../codeblocks/removeDir';
import { installExtensionProdDeps } from './installAll';
import { listExtension } from './list';
import { IExtensionPath } from './path';

export async function packExtensionModules(output: OutputStreamControl, {targetRoot}: IExtensionPath) {
	await installExtensionProdDeps(output, {targetRoot});
	for (const extName of await listExtension()) {
		const resultDir = resolve(targetRoot, extName);
		chdir(resultDir);
		process.env.PACK_TARGET = resultDir;
		await pipeCommandOut(
			output, 'node', ...gulpCommands(targetRoot), '--gulpfile', resolve(MY_SCRIPT_ROOT, 'gulpfile/pack-ext.js'),
		);
		output.writeln('    packed ' + extName + ' deps.');
		
		await removeDirectory(resolve(resultDir, 'node_modules'));
	}
}