import { request } from './request/request';

export function nodeHttpFetch(method: string, url: string, headers: object = {}) {
	return request({
		type: method,
		url,
		headers,
		followRedirects: 3,
		strictSSL: true,
	});
}

export function loadJson<T>(url: string): Promise<T> {
	return fetch(url).then((res) => {
		if (res.status === 200) {
			return res.json();
		} else {
			throw new Error(`${res.status}: ${res.statusText}`);
		}
	});
}