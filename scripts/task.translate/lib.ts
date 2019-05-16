import { IKey, IMetaDataStruct } from './type';

export function* everyMetadata(metadata: IMetaDataStruct) {
	for (const [file, keys] of Object.entries(metadata.keys)) {
		if (!file.startsWith('vs/kendryte')) {
			continue;
		}
		
		for (const [index, keyItem] of (keys as IKey[]).entries()) {
			const key = toKeyString(keyItem);
			const message = metadata.messages[file][index];
			
			yield {file, index, key, message};
		}
	}
}

export function toKeyString(ks: IKey): string {
	return typeof ks === 'string'? ks : ks.key;
}
