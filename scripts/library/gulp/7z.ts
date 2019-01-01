import { spawn } from 'child_process';
import { readdir, rename, rmdir } from 'fs-extra';
import { processPromise } from '../childprocess/handlers';
import { log } from '../gulp';
import { mkdirpSync } from '../misc/fsUtil';
import { nativePath } from '../misc/pathUtil';

const p7z = require('7zip-bin').path7za;

export async function compress7z(zipFile: string, sourceFolder: string) {
	const szCmd = [
		'a',
		'-y', // --yes
		'-ssc', // sensitive case mode
		'-bso1', // standard output messages -> stdout
		'-bse2', // error messages -> stderr
		'-bsp0', // progress information -> mute
		'-t7z', // compress to xxx.7z
		'-ms=on', // solid
		'-mx8', // more compress
		'-mmt', // multi thread
		zipFile,
		'*',
	];
	
	const opt = {
		cwd: sourceFolder,
	};
	
	log(`Compress: ${sourceFolder}`);
	const cp = spawn(p7z, szCmd, opt);
	await processPromise(cp, [p7z, szCmd], opt);
	log(`Compress complete: ${zipFile}`);
}

export async function extract7z(zip: string, extractTo: string): Promise<void> {
	const temp = extractTo + '.tmp';
	const szCmd = [
		'x',
		'-y',
		zip,
	];
	log('Decompress: ' + zip);
	const opt = {
		cwd: temp,
		stdio: 'ignore',
	};
	
	mkdirpSync(temp);
	
	await processPromise(spawn(p7z, szCmd, opt), [p7z, szCmd], opt).catch((e) => {
		log.error('Failed to extract ' + zip);
		throw e;
	});
	
	const child = await readdir(temp);
	if (child.length === 1) {
		await rename(nativePath(temp, child[0]), extractTo);
		await rmdir(temp);
	} else {
		await rename(temp, extractTo);
	}
	log('Decompress complete: ' + extractTo);
}
