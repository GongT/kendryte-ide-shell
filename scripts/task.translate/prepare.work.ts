import { pathExists, readJson } from 'fs-extra';
import { writeFile } from '../library/misc/fsUtil';
import { cmp_string } from '../library/strings';
import { JsonBuilder } from './json5Create';
import { everyMetadata } from './lib';
import { mergeWorkingIfExists } from './merge';
import { metadataFile, translateWorkingFile, versionControlFile } from './path';
import { IMetaDataStruct, IResultFile, IResultFileContent, languageList, MyTranslate, TranslateMap } from './type';

export async function doTranslate() {
	for (const language of languageList) {
		const builder = await initTranslations(language);
		
		const transResult = translateWorkingFile(language);
		await writeFile(transResult, builder.toString());
	}
}

function getMessage(translate: IResultFileContent, file: string, key: string) {
	if (translate[file] && translate[file][key]) {
		return translate[file][key];
	} else {
		return '';
	}
}

async function initTranslations(lang: string) {
	const metadata: IMetaDataStruct = await readJson(metadataFile());
	const previousFile = versionControlFile(lang);
	const previousMetadata: IResultFile = await pathExists(previousFile)? await readJson(previousFile) : {};
	
	const translates: MyTranslate[] = [];
	
	// parse translation sections from metadata
	for (const {file, key, message} of everyMetadata(metadata)) {
		const previousMessage = getMessage(previousMetadata.contents, file, key);
		console.log('Key[%s] %s -> %s', key, previousMessage, message);
		
		translates.push({
			filename: file,
			key,
			english: message,
			previousEnglish: previousMessage,
			changed: message !== previousMessage,
			deleted: false,
			message: '',
		});
	}
	
	// remove duplicate entries
	for (let i = translates.length - 1; i >= 0; i--) {
		const current = translates[i];
		const foundFirst = translates.findIndex((trans) => {
			return trans.filename === current.filename && trans.key === current.key;
		});
		
		if (foundFirst !== i) {
			translates.splice(foundFirst, 1);
		}
	}
	
	// read translate result: translate & working file
	const transFileData = await mergeWorkingIfExists(lang);
	
	// fill messages from result to translate sections
	const translateInAnyFile: TranslateMap = {};
	for (const translate of translates) {
		translate.message = getMessage(transFileData.contents, translate.filename, translate.key);
		if (translate.message) {
			translateInAnyFile[translate.key] = translate.message;
		}
		if (transFileData.contents[translate.filename]) {
			delete transFileData.contents[translate.filename][translate.key];
		}
	}
	
	// handle deleted entries
	for (const [filename, transMap] of Object.entries(transFileData.contents)) {
		for (const [key, message] of Object.entries(transMap)) {
			translateInAnyFile[key] = message;
			translates.push({
				filename,
				key,
				english: '',
				previousEnglish: '',
				changed: false,
				deleted: true,
				message: message,
			});
		}
	}
	
	// refill-moved items
	for (const translate of translates) {
		if (translate.message) {
			continue;
		}
		if (translateInAnyFile[translate.key]) {
			translate.message = translateInAnyFile[translate.key];
		}
	}
	
	translates.sort((a, b) => {
		const fnc = cmp_string(a.filename, b.filename);
		if (fnc === 0) {
			return cmp_string(a.key, b.key);
		} else {
			return fnc;
		}
	});
	
	const builder = new JsonBuilder;
	builder.startObject();
	builder.writeKeyValue('version', transFileData.version);
	builder.writeKey('contents');
	builder.startObject();
	
	let lastFileName: string = '';
	for (const translate of translates) {
		if (lastFileName !== translate.filename) {
			if (lastFileName) {
				builder.endObject();
			}
			builder.writeKey(translate.filename);
			builder.startObject();
			lastFileName = translate.filename;
		}
		
		if (translate.changed && translate.previousEnglish && translate.message) {
			builder.writeComment('fixme', `Changed,must update\n   from: ${translate.previousEnglish}\n     to: ${translate.english}`);
		} else if (translate.changed && !translate.previousEnglish) {
			builder.writeComment('todo', `New key, translate from: ${translate.english}`);
		} else if (translate.deleted) {
			builder.writeComment('todo', `ensure delete message`);
		} else if (!translate.message) {
			builder.writeComment('fixme', `Fill this translation`);
		}
		builder.writeKeyValue(translate.key, translate.message);
	}
	builder.endObject();
	builder.endObject();
	
	builder.endObject();
	
	return builder;
}
