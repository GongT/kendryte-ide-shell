import { resolvePath } from '../library/misc/pathUtil';
import { artifactsExtractedTempPath } from '../library/paths/ide';
import { EXTENSIONS_SOURCE_CODE_PATH } from '../task.extensions/path';

export function translateWorkingFile(lang: string) {
	return resolvePath(EXTENSIONS_SOURCE_CODE_PATH, `kendryte-translate/translations/kendryte_${lang}.i18n.json5`);
}

export function translateFinalFile(lang: string) {
	return resolvePath(EXTENSIONS_SOURCE_CODE_PATH, `kendryte-translate/translations/kendryte_${lang}.i18n.json`);
}

export function metadataFile() {
	const extractTo = artifactsExtractedTempPath('linux', 'latest');
	return resolvePath(extractTo, 'resources/app/out/nls.metadata.json');
}

export function versionControlFile(lang: string) {
	return resolvePath(EXTENSIONS_SOURCE_CODE_PATH, `kendryte-translate/translations/kendryte_${lang}.previous.metadata.json`);
}
