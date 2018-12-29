import { alwaysPromise } from './alwaysPromise';
import { streamPromise } from './streamPromise';

export interface ICleanupFunction {
	(): Promise<any>|void;
}

const list: ICleanupFunction[] = [];

const displayName = Symbol('displayName');

export function registerCleanup(dispose: ICleanupFunction, name?: string): () => ICleanupFunction {
	list.push(dispose);
	
	Object.assign(dispose, {
		[displayName]: name || dispose.name || 'no name',
	});
	
	return () => {
		const index = list.indexOf(dispose);
		if (index !== -1) {
			return list.splice(index, 1)[0];
		}
		return () => {
			console.error(dispose.toString());
			throw new Error('Oops, some dispose function called twice.');
		};
	};
}

export function registerCleanupClosablePromise(p: Promise<any>, close: () => void) {
	const cleanupGet = registerCleanup(() => {
		close();
		return p;
	});
	alwaysPromise(p, cleanupGet);
	return cleanupGet;
}

export function registerCleanupStream(stream: NodeJS.WritableStream, extraClean?: (stream: NodeJS.WritableStream) => void) {
	return registerCleanupClosablePromise(streamPromise(stream), () => {
		if (extraClean) {
			extraClean(stream);
		}
		stream.end();
	});
}

export async function doCleanup() {
	console.log('doCleanup: ');
	for (const cb of list) {
		const name = (cb as any)[displayName];
		console.log(' * %s - ', name);
		await Promise.resolve(cb()).then(() => {
			console.log('    OK!');
		}, (e) => {
			console.log('    Fail! (%s)', e.stack.split('\n', 2).map((e: string) => e.trim()).join(' '));
		});
	}
	console.log('All cleanup job finished');
}
