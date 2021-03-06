import { createWriteStream, ftruncateSync } from 'fs';
import { ClientRequest, IncomingMessage, request as requestHttp } from 'http';
import { request as requestHttps, RequestOptions } from 'https';
import { tmpdir } from 'os';
import { basename, resolve } from 'path';
import { parse } from 'url';
import { close, isExists, open, readFile } from './fsUtil';
import { CollectingStream, streamPromise } from './streamUtil';

export function request(url: string, options: RequestOptions, callback?: (res: IncomingMessage) => void): ClientRequest {
	const request = url.startsWith('https')? requestHttps : requestHttp;
	const uri = parse(url);
	return request({
		...options,
		host: uri.host,
		port: uri.port,
		path: uri.path,
	}, callback);
}

function requestPromise(url: string, options: RequestOptions): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		request(url, options, (res) => {
			resolve(res);
		}).end();
	});
}

export async function getWithCache(url: string) {
	const cache = resolve(tmpdir(), basename(url));
	if (await isExists(cache)) {
		return await readFile(cache);
	}
	
	const fd = await open(cache, 'w');
	ftruncateSync(fd);
	const write = createWriteStream(cache, {fd});
	const collect = new CollectingStream();
	
	const res = await requestPromise(url, {});
	res.pipe(write);
	res.pipe(collect);
	
	await streamPromise(write);
	
	await close(fd).catch(() => void 0);
	
	return collect.promise();
}