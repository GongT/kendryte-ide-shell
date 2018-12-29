import { resolve } from 'path';
import { installDependency } from '../../library/childprocess/yarn';
import { log } from '../../library/gulp';
import { isExists, unlink } from '../../library/misc/fsUtil';
import { listExtension } from './list';
import { IExtensionPath } from './path';

export async function installExtensionDevelopDeps({sourceRoot}: Pick<IExtensionPath, 'sourceRoot'>) {
	log('installing all dependencies for kendryte extensions...');
	await installDependency(sourceRoot);
	log('  base deps installed.');
	for (const extName of await listExtension()) {
		const path = resolve(sourceRoot, extName);
		log('  install for ' + path);
		await installDependency(path);
		log('  deps for ' + extName + ' installed.');
	}
}

export async function installExtensionProdDeps({targetRoot}: Pick<IExtensionPath, 'targetRoot'>) {
	log('installing production dependencies for kendryte extensions...');
	
	for (const extName of await listExtension()) {
		const distPath = resolve(targetRoot, extName);
		log('  install for ' + extName);
		await installDependency(distPath, {args: ['--production']});
		log('  deps for ' + extName + ' installed.');
		
		if (await isExists(resolve(distPath, 'yarn-install.log'))) {
			await unlink(resolve(distPath, 'yarn-install.log'));
		}
	}
}
