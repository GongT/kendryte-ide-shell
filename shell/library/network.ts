import { CollectingStream } from './collectStream';
import { request } from './request/request';
import { streamPromise } from './streamPromise';

export function nodeHttpFetch(method: string, url: string, headers: object = {}) {
	const opt = {
		keepAlive: true,
		type: method,
		url,
		headers,
		followRedirects: 3,
		strictSSL: true,
	};
	return request(opt).then((passing) => {
		if (passing.res.statusCode >= 400) {
			console.warn('Request return %s. the input is: %O', passing.res.statusCode, opt);
		}
		return passing;
	});
}

export function loadJson<T>(url: string): Promise<T> {
	console.groupCollapsed('[load json]', url);
	return _loadJson<T>('' + url).then((d) => {
		console.log(d);
		console.groupEnd();
		return d;
	}, (e) => {
		console.error(e);
		console.groupEnd();
		throw e;
	});
}

export async function _loadJson<T>(url: string): Promise<T> {
	const {res, stream} = await request({url});
	console.log(res);
	if (res.statusCode === 200) {
		console.log('start piping');
		const data = stream.pipe(new CollectingStream());
		await streamPromise(stream as NodeJS.ReadableStream);
		console.log('response end');
		await streamPromise(data);
		console.log('pipe end');
		const text = data.getOutput();
		console.log(text);
		return JSON.parse(text);
	} else {
		throw new Error(`HTTP ${res.statusCode}: ${url}`);
	}
}
