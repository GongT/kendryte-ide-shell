import { createReadStream, createWriteStream, ftruncateSync, openSync, ReadStream, WriteStream } from 'fs';
import { resolve } from 'path';
import { BUILD_ROOT } from '../../environment';
import { log } from '../gulp';
import { mkdirpSync } from './fsUtil';
import { currentCommand, WIT } from './help';
import { streamPromise } from './streamUtil';
import { timeout } from './timeUtil';

export interface DisposeFunction {
	(e?: Error): void;
}

const disposeList: DisposeFunction[] = [];

export function mainDispose(dispose: DisposeFunction) {
	disposeList.push(dispose);
}

const knownProxyVar = [
	'HTTP_PROXY',
	'HTTPS_PROXY',
	'ALL_PROXY',
	'NO_PROXY',
	'FORCE_PROXY',
];
for (const i of Object.keys(process.env)) {
	if (knownProxyVar.includes(i)) {
		continue;
	}
	if (i.toUpperCase().endsWith('_PROXY')) {
		console.error('Warn: environment variable %s is ignored.', i);
		delete process.env[i];
	}
}

export function preventProxy() {
	const proxy = process.env.FORCE_PROXY || '';
	if (proxy) {
		process.env.HTTP_PROXY = process.env.HTTPS_PROXY = process.env.ALL_PROXY = proxy;
	} else {
		delete process.env.HTTP_PROXY;
		delete process.env.HTTPS_PROXY;
		delete process.env.ALL_PROXY;
		delete process.env.FORCE_PROXY;
	}
}

const jobQueue: Function[] = [];

export function runMain(main: () => Promise<void|number>) {
	if (WIT()) {
		return;
	}
	jobQueue.push(main);
	if (jobQueue.length === 1) {
		log('--');
		setImmediate(runHandle);
	}
}

function runHandle() {
	log('start: ', jobQueue.length);
	run().catch((e) => {
		console.error(e);
		return 1;
	}).then(async (code) => {
		while (disposeList.length) {
			try {
				await disposeList.shift()();
			} catch (e) {
			}
			await timeout(500); // give time to finish
		}
		if (code) {
			console.error('\x1B[38;5;14m' + currentCommand().file + ' error with code 1\x1B[0m');
		}
		process.exit(code);
	});
}

async function run(): Promise<number> {
	for (const cb of jobQueue) {
		const ret = await cb() as any;
		if (ret) {
			return ret;
		}
	}
	return 0;
}

export function useWriteFileStream(file: string): WriteStream&{fsPath: string} {
	file = resolve(BUILD_ROOT, file);
	mkdirpSync(resolve(file, '..'));
	const fd = openSync(file, 'w');
	ftruncateSync(fd);
	const stream = createWriteStream(file, {encoding: 'utf8', fd});
	mainDispose((error: Error) => {
		stream.end();
		return streamPromise(stream);
	});
	return Object.assign(stream, {
		fsPath: file,
	});
}

export function readFileStream(file: string): ReadStream {
	const fd = openSync(file, 'r+');
	const stream = createReadStream(file, {encoding: 'utf8', fd});
	mainDispose((error: Error) => {
		stream.close();
		return streamPromise(stream);
	});
	return stream;
}
