import { CollectingStream } from './collectStream';
import { request } from './request/request';
import { streamPromise } from './streamPromise';

export function nodeHttpFetch(method: string, url: string, headers: object = {}) {
	const opt = {
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

export async function loadJson<T>(url: string): Promise<T> {
	const {res, stream} = await request({url});
	if (res.statusCode === 200) {
		const data = new CollectingStream();
		stream.pipe(data);
		await streamPromise(data);
		return JSON.parse(data.getOutput());
	} else {
		throw new Error(`HTTP ${res.statusCode}: ${url}`);
	}
}
