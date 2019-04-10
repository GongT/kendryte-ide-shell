export const languageList = ['zh-cn'];

export type IKey = string|{key: string, comment: string[]};

export interface IMetaDataStruct {
	keys: {
		[file: string]: IKey[];
	}
	messages: {
		[file: string]: string[];
	}
}

export interface TranslateMap {
	[key: string]: string; // message
}

export interface MyTranslate {
	readonly filename: string;
	readonly key: string;
	readonly english: string;
	readonly previousEnglish: string;
	readonly changed: boolean;
	readonly deleted: boolean;
	message: string;
}

export interface IResultFileContent {
	[file: string]: TranslateMap;
}

export interface IResultFile {
	version: string;
	contents: IResultFileContent;
}