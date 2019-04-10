import { copy, pathExists, unlink } from 'fs-extra';
import { readFile, writeFile } from '../library/misc/fsUtil';
import { metadataFile, translateFinalFile, translateWorkingFile, versionControlFile } from './path';
import { IResultFile, languageList } from './type';
import json5 = require('json5');

export async function doCommitTranslate() {
	for (const language of languageList) {
		await commitTranslate(language);
	}
}

async function commitTranslate(lang: string) {
	const workingFile = translateWorkingFile(lang);
	if (!await pathExists(workingFile)) {
		console.log('Working file exists: %s', workingFile);
	}
	
	const data: IResultFile = json5.parse(await readFile(workingFile));
	
	let allOk = true;
	Object.entries(data).forEach(([filename, map]) => {
		Object.entries(map).forEach(([key, value]) => {
			if (!value) {
				allOk = false;
				console.error('Not filled key: %s :: %s', filename, map);
			}
		});
	});
	if (!allOk) {
		throw new Error('some key not filled');
	}
	
	await writeFile(translateFinalFile(lang), JSON.stringify(data, null, 4));
	await unlink(workingFile);
	await copy(metadataFile(), versionControlFile(lang));
}
