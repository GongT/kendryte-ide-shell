import { copy, mkdirp, symlink } from 'fs-extra';
import { relative, resolve } from 'path';
import { log } from '../../library/gulp';
import { isExists } from '../../library/misc/fsUtil';
import { removeDirectory } from '../codeblocks/removeDir';
import { listExtension } from './list';
import { getExtensionPath, IExtensionPath } from './path';

export async function prepareLinkForDev() {
	const {targetRoot, sourceRoot} = getExtensionPath(false);
	for (const extName of await listExtension()) {
		log(extName + ':\n');
		const source = resolve(sourceRoot, extName);
		const target = resolve(targetRoot, extName);
		
		await removeDirectory(target);
		
		log(`   copy items from ${source} to ${target}\n`);
		await mkdirp(target);
		await copy(resolve(source, 'package.json'), resolve(target, 'package.json'));
		await copy(resolve(source, '../yarn.lock'), resolve(target, 'yarn.lock'));
		
		log(`   link node_modules from ${source} to ${target}\n`);
		await symlink(
			relative(target, resolve(source, 'node_modules')),
			resolve(target, 'node_modules'),
		);
	}
	
	const nmTarget = resolve(targetRoot, 'node_modules');
	if (await isExists(nmTarget)) {
		await removeDirectory(targetRoot);
	}
	await symlink(
		relative(targetRoot, resolve(sourceRoot, 'node_modules')),
		resolve(nmTarget),
	);
}

export async function prepareLinkForProd({targetRoot, sourceRoot}: IExtensionPath) {
	for (const extName of await listExtension()) {
		log(extName + ':');
		const source = resolve(sourceRoot, extName);
		const target = resolve(targetRoot, extName);
		
		log(`   copy items from ${source} to ${target}`);
		await mkdirp(target);
		await copy(resolve(source, 'package.json'), resolve(target, 'package.json'));
		await copy(resolve(source, '../yarn.lock'), resolve(target, 'yarn.lock'));
	}
}
