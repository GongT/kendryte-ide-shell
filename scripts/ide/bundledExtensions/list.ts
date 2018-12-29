import { readdir } from 'fs-extra';
import { basename, resolve } from 'path';
import { isExists } from '../../library/misc/fsUtil';
import { getExtensionPath } from './path';

export async function listExtension(): Promise<string[]> {
	const {sourceRoot} = getExtensionPath(false);
	
	const ret = [];
	const list = await readdir(sourceRoot);
	for (const item of list) {
		const abs = resolve(sourceRoot, item);
		const base = basename(abs);
		if (base === 'compiler') {
			continue;
		}
		if (await isExists(resolve(abs, 'package.json'))) {
			ret.push(base);
		}
	}
	return ret;
}