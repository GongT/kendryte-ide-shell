import { OutputStreamControl } from '@gongt/stillalive';
import { resolve } from 'path';
import { readFile } from '../../library/misc/fsUtil';
import { ICompileOptions } from '../../library/jsonDefine/packageRegistry';

export async function readPackageInfo(output: OutputStreamControl, packRoot: string) {
	const jsonFile = resolve(packRoot, 'kendryte-package.json');
	output.writeln('read package info from: ' + jsonFile);
	
	const data: ICompileOptions = (void 0 || eval)('data=' + await readFile(jsonFile) + ';');
	output.writeln(JSON.stringify(data, null, 2));
	
	return data;
}