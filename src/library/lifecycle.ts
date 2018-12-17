import { alwaysPromise } from './alwaysPromise';
import { streamPromise } from './streamPromise';

export interface ICleanupFunction {
	(): Promise<any>|void;
}

const list: ICleanupFunction[] = [];

export function registerCleanup(dispose: ICleanupFunction): () => ICleanupFunction {
	list.push(dispose);
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
	for (const cb of list) {
		await cb();
	}
}
