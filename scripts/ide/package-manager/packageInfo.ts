import { resolve } from 'path';
import { log } from '../../library/gulp';
import { ICompileOptions } from '../../library/jsonDefine/packageRegistry';
import { readFile } from '../../library/misc/fsUtil';

export async function readPackageInfo(packRoot: string) {
	const jsonFile = resolve(packRoot, 'kendryte-package.json');
	log('read package info from: ' + jsonFile);
	
	const data: ICompileOptions = (void 0 || eval)('data=' + await readFile(jsonFile) + ';');
	log(JSON.stringify(data, null, 2));
	
	return data;
}
