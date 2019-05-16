import { pathExists, readJson, unlink, writeJson } from 'fs-extra';
import { readFile, writeFile } from '../library/misc/fsUtil';
import { everyMetadata } from './lib';
import { metadataFile, translateFinalFile, translateWorkingFile, versionControlFile } from './path';
import { IMetaDataStruct, IResultFile, IResultFileContent, languageList } from './type';
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
	
	const metadata: IMetaDataStruct = await readJson(metadataFile());
	const newContents: IResultFileContent = {};
	for (const {file, key, message} of everyMetadata(metadata)) {
		if (!newContents[file]) {
			newContents[file] = {};
		}
		newContents[file][key] = message;
	}
	await writeJson(versionControlFile(lang), {version: '-1', contents: newContents});
}
