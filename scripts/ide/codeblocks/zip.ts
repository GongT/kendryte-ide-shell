import { spawnSync } from 'child_process';
import { chmod, mkdirp } from 'fs-extra';
import { decodeStream } from 'iconv-lite';
import { join, resolve } from 'path';
import { Transform } from 'stream';
import { isWin, RELEASE_ROOT } from '../../environment';
import { pipeCommandBoth, pipeCommandOut } from '../../library/childprocess/complex';
import { mergeEnv } from '../../library/childprocess/env';
import { calcCompileFolderName, removeIfExists } from '../../library/misc/fsUtil';
import { chdir } from '../../library/misc/pathUtil';
import { nameReleaseFile, TYPE_ZIP_FILE } from './zip.name';

const _7z = isWin? require('7zip')['7z'] : '7z';

const commonArgs = [
	'-y', // --yes
	'-r', // recurse subdirectories
	'-ssc', // sensitive case mode
];
const outputArgs = [
	'-bso1', // standard output messages -> stdout
	'-bse2', // error messages -> stderr
	'-bsp0', // progress information -> mute
];
let invoke = normalOutput;
if (!isWin) {
	commonArgs.push('-mmt3'); // use 3 threads
	const r = spawnSync('7z', ['-bso1', '-h'], {
		stdio: 'pipe',
		encoding: 'utf8',
		...mergeEnv(),
	});
	if (/Incorrect command line/.test(r.output.join('\n'))) {
		invoke = oldOutput;
	}
}
const zipLzma2Args = [
	...commonArgs,
	'-t7z', // compress to xxx.7z
	'-ms=on', // solid
	'-mx8', // more compress
	'-m0=lzma2', // use LZMA2
	'-md=256m', // dictionary size
	'-mfb=64', // word size
];

async function createWindows7z(
	output: NodeJS.WritableStream,
	stderr: NodeJS.WritableStream,
	whatToZip: string,
	zipFileName: string,
	...zipArgs: string[]
) {
	output.write('creating windows 7z file...\n');
	zipFileName = resolve(releaseZipStorageFolder(), zipFileName);
	await removeIfExists(zipFileName);
	return invoke(output, stderr, 'a', ...zipLzma2Args, ...zipArgs, '--', zipFileName, join(whatToZip, '*'));
}

async function createPosix7z(
	output: NodeJS.WritableStream,
	stderr: NodeJS.WritableStream,
	whatToZip: string,
	zipFileName: string,
	...zipArgs: string[]
) {
	output.write('creating posix 7z file...\n');
	zipFileName = resolve(releaseZipStorageFolder(), zipFileName);
	await invoke(output, stderr, 'a', ...zipLzma2Args, ...zipArgs, '--', zipFileName, join(whatToZip, '*'));
	await chmod(zipFileName, '777');
}

export async function un7zip(from: string, to: string) {
	const stderr = new ProgressStream;
	stderr.pipe(process.stderr, {end: false});
	
	let stdout: NodeJS.WritableStream;
	if (isWin) {
		const convert = TransformEncode();
		convert.pipe(process.stderr);
		stdout = convert;
	} else {
		stdout = process.stderr;
	}
	
	await mkdirp(to);
	chdir(to);
	await invoke(
		stdout, stderr,
		'x',
		'-y',
		from,
	);
	
	if (stdout !== stdout) {
		stdout.end();
	}
}

export function releaseZipStorageFolder() {
	return resolve(RELEASE_ROOT, 'release-files');
}

function TransformEncode() {
	return Object.assign(decodeStream('936'), {noEnd: true});
}

class ProgressStream extends Transform {
	public noEnd = true;
	
	_transform(chunk: Buffer, encoding: string, callback: Function): void {
		const str = chunk.toString('ascii').replace(/[\x08\x0d]+/g, '\n').replace(/^ +| +$/g, '');
		this.push(str, 'utf8');
		callback();
	}
}

export async function creatingUniversalZip(sourceDir: string, namer: (type: string) => string) {
	if (isWin) {
		const convert = TransformEncode();
		convert.pipe(process.stderr);
		
		await createWindows7z(convert, process.stderr, sourceDir, await namer(TYPE_ZIP_FILE));
		
		convert.end();
	} else {
		await createPosix7z(process.stdout, process.stderr, sourceDir, await namer(TYPE_ZIP_FILE));
	}
}

export async function creatingReleaseZip() {
	chdir(RELEASE_ROOT);
	
	return creatingUniversalZip(await calcCompileFolderName(), nameReleaseFile());
}

function normalOutput(
	output: NodeJS.WritableStream,
	stderr: NodeJS.WritableStream,
	cmd: 'a'|'x',
	...args: string[]
) {
	return pipeCommandBoth(output, stderr, _7z, cmd, ...outputArgs, ...args);
}

function oldOutput(
	output: NodeJS.WritableStream,
	stderr: NodeJS.WritableStream,
	cmd: 'a'|'x',
	...args: string[]
) {
	return pipeCommandOut(stderr, _7z, cmd, ...args);
}
