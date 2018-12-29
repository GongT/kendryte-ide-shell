import { resolve } from 'path';
import { MY_SCRIPT_ROOT } from '../../environment';
import { pipeCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { chdir } from '../../library/misc/pathUtil';
import { gulpCommands } from '../codeblocks/gulp';
import { removeDirectory } from '../codeblocks/removeDir';
import { installExtensionProdDeps } from './installAll';
import { listExtension } from './list';
import { IExtensionPath } from './path';

export async function packExtensionModules({targetRoot}: IExtensionPath) {
	await installExtensionProdDeps({targetRoot});
	for (const extName of await listExtension()) {
		const resultDir = resolve(targetRoot, extName);
		chdir(resultDir);
		process.env.PACK_TARGET = resultDir;
		await pipeCommandOut(
			process.stderr, 'node', ...gulpCommands(targetRoot), '--gulpfile', resolve(MY_SCRIPT_ROOT, 'gulpfile/pack-ext.js'),
		);
		log('    packed ' + extName + ' deps.');
		
		await removeDirectory(resolve(resultDir, 'node_modules'));
	}
}
