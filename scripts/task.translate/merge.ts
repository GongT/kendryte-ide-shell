import { pathExists, readJson } from 'fs-extra';
import { readFile } from '../library/misc/fsUtil';
import { translateFinalFile, translateWorkingFile } from './path';
import { IResultFile } from './type';
import deepExtend = require('deep-extend');
import json5 = require('json5');

export async function mergeWorkingIfExists(lang: string) {
	const preFile: IResultFile = await readJson(translateFinalFile(lang));
	
	const working = translateWorkingFile(lang);
	if (await pathExists(working)) {
		console.log('Working file exists: %s', working);
		deepExtend(
			preFile,
			json5.parse(await readFile(working)),
		);
	}
	
	return preFile;
}
