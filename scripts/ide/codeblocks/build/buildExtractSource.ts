import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { resolve } from 'path';
import { PassThrough } from 'stream';
import { extract } from 'tar-fs';
import { ARCH_RELEASE_ROOT, RELEASE_ROOT, VSCODE_ROOT } from '../../../environment';
import { getOutputCommand, muteCommandOut, pipeCommandBoth } from '../../../library/childprocess/complex';
import { log } from '../../../library/gulp';
import { isExists, rename } from '../../../library/misc/fsUtil';
import { chdir } from '../../../library/misc/pathUtil';
import { streamPromise } from '../../../library/misc/streamUtil';
import { timing } from '../../../library/misc/timeUtil';
import { removeDirectory } from '../removeDir';
import { compareHash, saveHash } from '../statusHash';

export async function extractSourceCodeIfNeed() {
	chdir(VSCODE_ROOT);
	const timeOut = timing();
	
	log('creating source code snapshot...');
	const hash = await createSourceSnapshot();
	log('   code hash: ' + hash);
	
	if (await compareHash('source-code', hash)) {
		log('source code not changed.' + timeOut());
	} else {
		log('source code has changed, making new directory.');
		await recreateSourceCodes();
		await saveHash('source-code', hash);
		log('complete action on create source:' + timeOut());
	}
}

async function createSourceSnapshot() {
	const hasher = createHash('md5');
	let md5 = '';
	hasher.on('data', (data: Buffer) => {
		md5 = data.toString('hex').toLowerCase();
	});
	
	const snapshotFile = resolve(RELEASE_ROOT, 'building-source-snapshot.tar');
	if (await isExists(snapshotFile)) {
		await rename(snapshotFile, resolve(RELEASE_ROOT, 'prev-snapshot.tar'));
	}
	
	const multiplex = new PassThrough();
	multiplex.pipe(createWriteStream(snapshotFile));
	multiplex.pipe(hasher);
	
	await writeSourceCodeStream(multiplex);
	await streamPromise(multiplex);
	await streamPromise(hasher);
	
	return md5;
}

async function recreateSourceCodes() {
	const node_modules = resolve(ARCH_RELEASE_ROOT, 'node_modules');
	const temp_node_modules = resolve(RELEASE_ROOT, 'saved_node_modules');
	
	if (await isExists(ARCH_RELEASE_ROOT)) {
		log('old source code exists.');
		if (await isExists(node_modules)) {
			log('old node_modules exists, move it out.');
			await rename(node_modules, temp_node_modules);
		}
		log('remove old source code...');
		await removeDirectory(ARCH_RELEASE_ROOT).catch((e) => {
			log(e.message);
			log(`Did you opened any file in ${ARCH_RELEASE_ROOT}?`);
			throw e;
		});
		log('dist directory clean.');
	} else {
		log('no old source code exists.');
	}
	
	log('writing source code:');
	const untar = extract(ARCH_RELEASE_ROOT);
	await writeSourceCodeStream(untar);
	log('source code directory created.');
	
	if (await isExists(temp_node_modules)) {
		log('move old node_modules back...');
		await rename(temp_node_modules, node_modules);
	}
	
	const gypTemp = resolve(process.env.HOME, '.node-gyp');
	if (await isExists(gypTemp)) {
		log('remove node-gyp at HOME...');
		await removeDirectory(gypTemp);
	}
}

async function writeSourceCodeStream(writeTo: NodeJS.WritableStream) {
	const version = await getCurrentVersion();
	
	log('processing source code tarball...');
	await pipeCommandBoth(writeTo, process.stderr, 'git', 'archive', '--format', 'tar', version);
}

let knownVersion: string;

async function getCurrentVersion() {
	if (knownVersion) {
		return knownVersion;
	}
	log(`Checking git status.`);
	await muteCommandOut('git', 'add', '.');
	const result = await getOutputCommand('git', 'status');
	
	let currentVersion: string;
	if (result.indexOf('Changes to be committed') === -1) {
		currentVersion = 'HEAD';
	} else {
		currentVersion = await getOutputCommand('git', 'stash', 'create');
	}
	log(`Git Current Version: ${currentVersion}.`);
	return knownVersion = currentVersion;
}
