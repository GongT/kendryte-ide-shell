import { createHash } from 'crypto';
import { resolve } from 'path';
import { RELEASE_ROOT } from '../../environment';
import { log } from '../../library/gulp';
import { isExists, mkdirpSync, readFile, writeFile } from '../../library/misc/fsUtil';

export function md5(buffer: Buffer|string): string {
	return createHash('md5').update(buffer).digest('hex');
}

export async function compareHash(id: string, value: string): Promise<boolean> {
	const prev = await readHash(id);
	log(`compare hash - ${id}\n\tOld: ${prev}\n\tNew: ${value}\n`);
	return prev === value;
}

export function saveHash(id: string, value: string): Promise<void> {
	const hashDir = resolve(RELEASE_ROOT, 'hash');
	const hashFile = resolve(hashDir, id + '.md5');
	
	log(`save hash - ${id} = ${value}`);
	mkdirpSync(hashDir);
	return writeFile(hashFile, value);
}

async function readHash(id: string): Promise<string> {
	const hashFile = resolve(RELEASE_ROOT, 'hash', id + '.md5');
	if (await isExists(hashFile)) {
		return await readFile(hashFile);
	} else {
		return '';
	}
}
