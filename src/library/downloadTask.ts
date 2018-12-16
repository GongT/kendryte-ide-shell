import { createWriteStream } from 'fs';
import { ensureDir, pathExists, readFile, truncate, writeFile } from 'fs-extra';
import { IncomingHttpHeaders } from 'http';
import { dirname } from 'path';
import { tempDir } from './environment';
import { logger } from './logger';
import { nodeHttpFetch } from './network';
import { IRequestContext } from './request/request';
import { streamPromise } from './streamPromise';

const progressStream = require('progress-stream');

export interface IDownloadTargetInfo {
	url: string;
	total: number;
	current: number;
	check: string;
	etag: string;
	lastModified: string;
	target: string;
	thisFile: string;
}

export function downloadedFilePath(fileName: string) {
	return tempDir(fileName);
}

export async function downloadFile(url: string, fileName: string) {
	logger.progress(Infinity);
	
	await ensureDir(tempDir('.'));
	
	const target = downloadedFilePath(fileName);
	const partInfo = await loadFromResumeFile(url, target);
	await checkInfo(partInfo);
	
	if (partInfo.total === partInfo.current) {
		logger.debug('success, no need download any data.');
		return target;
	}
	
	const headers = partInfo.total? {
		'range': `bytes=${partInfo.current}-${partInfo.total}`,
		'if-range': partInfo.check,
	} : {};
	
	const {res, stream}: IRequestContext = await nodeHttpFetch('GET', partInfo.url, headers);
	
	if (res.statusCode === 200) { // success, but not part response
		logger.debug('success, but not part response (200).');
		partInfo.current = 0;
	} else if (res.statusCode === 206) {
		logger.debug('success, 206.');
	} else { // faield response
		console.log('', headers);
		throw new Error(`HTTP: ${res.statusCode} HEAD ${partInfo.url}`);
	}
	
	logger.sub2(`--`);
	
	const fd = createWriteStream(partInfo.target, {
		flags: 'r+',
		autoClose: true,
		start: partInfo.current,
	});
	logger.debug('starting piping to file');
	
	const progress = progressStream({
		time: 300,
		length: partInfo.total,
		transferred: partInfo.current,
	});
	progress.on('progress', triggerCurrentChange);
	
	stream.pipe(progress).pipe(fd);
	stream.on('data', (buff: Buffer) => {
		// console.log('chunk: ' + buff.length);
		partInfo.current += buff.length;
	});
	
	const to = setInterval(() => {
		flush(partInfo).catch((e) => {
			console.log(e);
			logger.debug(`minor error when flush: ${e.message}`);
		});
	}, 5000);
	
	await streamPromise(fd);
	
	clearInterval(to);
	await flush(partInfo);
	
	logger.debug('finishing piping');
	
	logger.sub2(`--`);
	
	return target;
}

function size(size: number) {
	let u: string;
	if (size > 1024 * 1024) {
		u = 'MB';
		size = size / 1024 / 1024;
	} else if (size > 1024) {
		u = 'KB';
		size = size / 1024;
	} else {
		u = 'B';
	}
	return `${size.toFixed(2).replace(/\.?0+$/, '')}${u}`;
}

function triggerCurrentChange(p: any) {
	logger.progress(p.percentage);
	logger.sub2(`${p.percentage.toFixed(2)}% @ ${size(p.speed)}/s\n${size(p.remaining)} -${p.eta}> ${size(p.transferred)}`);
}

async function loadFromResumeFile(url: string, target: string): Promise<IDownloadTargetInfo> {
	const resumeFile = target + '.partDownloadInfo';
	console.log(`Download:\n\tFrom: ${url}\n\tTo: ${target}{,.partDownloadInfo}`);
	if (await pathExists(resumeFile) && await pathExists(target)) {
		const data: IDownloadTargetInfo = JSON.parse(await readFile(resumeFile, 'utf8'));
		data.url = url;
		data.target = target;
		data.thisFile = resumeFile;
		return data;
	} else {
		await ensureDir(dirname(target));
		return {
			url,
			thisFile: resumeFile,
			target,
		} as IDownloadTargetInfo;
	}
}

function getFirstHeader(headers: IncomingHttpHeaders, key: string): string {
	const values = headers[key];
	if (values) {
		return Array.isArray(values)? values[0] : values;
	} else {
		return '';
	}
}

async function checkInfo(partInfo: IDownloadTargetInfo) {
	const headers: any = {};
	
	if (partInfo.etag) {
		headers['if-none-match'] = partInfo.etag;
	} else if (partInfo.lastModified) {
		headers['if-modified-since'] = partInfo.lastModified;
	}
	
	logger.debug('check remote changed: ' + JSON.stringify(headers));
	const {res} = await nodeHttpFetch('HEAD', partInfo.url, headers);
	
	if (res.statusCode === 304) {
		logger.debug(`  -> NOT changed. continue download (from ${partInfo.current}).`);
		return;
	}
	
	logger.debug('  -> changed or non-exists! reset download status.');
	if (await pathExists(partInfo.target)) {
		await truncate(partInfo.target, 0);
	} else {
		await writeFile(partInfo.target, Buffer.alloc(0));
	}
	
	parsePartInfoFromResponse(partInfo, res);
	await flush(partInfo);
}

function flush(partInfo: IDownloadTargetInfo): Promise<void> {
	const {url, target, thisFile, ...resumeFile} = partInfo;
	console.log(`flush: [${thisFile}] ${JSON.stringify(resumeFile, null, 2)}`);
	return writeFile(thisFile, JSON.stringify(resumeFile, null, 2));
}

function parsePartInfoFromResponse(partInfo: IDownloadTargetInfo, resp: IRequestContext['res']) {
	logger.debug(`response: ${resp.statusCode} ${resp.headers}`);
	if (resp.statusCode !== 200) {
		logger.debug('request HEAD got error: ' + resp.statusCode);
		throw new Error(`HTTP: ${resp.statusCode} HEAD ${partInfo.url}`);
	}
	
	if (getFirstHeader(resp.headers, 'accept-ranges').toLowerCase() === 'bytes') {
		partInfo.total = parseInt(getFirstHeader(resp.headers, 'content-length'));
		console.log('request HEAD got size: ', partInfo.total);
	} else {
		partInfo.total = NaN;
		console.log('request HEAD got not support ranges: NaN');
	}
	
	partInfo.current = 0;
	
	partInfo.etag = getFirstHeader(resp.headers, 'etag') || '';
	partInfo.lastModified = getFirstHeader(resp.headers, 'last-modified') || '';
	partInfo.check = partInfo.etag || partInfo.lastModified;
	logger.debug(`request HEAD got hash: ${partInfo.check}`);
}
