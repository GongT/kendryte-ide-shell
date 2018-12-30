import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { Readable } from 'stream';
import * as File from 'vinyl';
import { createVinylFile, limitSpeedTransform, log, pluginError } from '../gulp';
import { ExS3, getMime } from '../misc/awsUtil';
import { CollectingStream, streamPromise } from '../misc/streamUtil';

const temp = tmpdir();

export interface MimeSetter {
	(fileName: string): string;
}

function uploadQueue(opts: gulpS3.DestOptions) {
	const {s3, base} = opts;
	return limitSpeedTransform(2, function (this: Readable, file: File): Promise<void> {
		if (file.isDirectory() || file.isNull()) {
			return Promise.resolve();
		}
		if (file.isSymbolic && file.isSymbolic()) {
			return Promise.resolve();
		}
		
		const {mime, hash} = getMime(file.basename);
		const path = resolve('/', base? base : '.', file.relative);
		let p: Promise<any>;
		if (file.isStream()) {
			log('Upload file (stream, %s KB) to S3: %s.', file.stat.size / 1000, path);
			p = s3.uploadStream(path, mime, file.contents, hash? file.clone().contents : null);
		} else if (file.isBuffer()) {
			log('Upload file (buffer, %s KB) to S3: %s.', file.contents.length / 1000, path);
			p = s3.uploadBuffer(path, mime, file.contents, hash);
		} else {
			return Promise.reject(pluginError('s3-upload', new Error('failed to upload, not support file type.')));
		}
		
		p.then(() => {
			this.push(file);
		});
		
		return p.catch((e: Error) => {
			throw pluginError('s3-upload', e);
		});
	});
}

export namespace gulpS3 {
	
	export interface DestOptions {
		s3?: ExS3;
		base?: string;
	}
	
	export function dest(opts?: DestOptions): NodeJS.ReadWriteStream {
		if (!opts) {
			opts = {};
		}
		if (!opts.s3) {
			opts.s3 = ExS3.instance();
		}
		
		return uploadQueue(opts);
	}
	
	export interface SrcOptions {
		s3?: ExS3;
		mode?: 'buffer'|'stream'
	}
	
	export function src(files: string|string[], opts?: SrcOptions) {
		if (!opts) {
			opts = {};
		}
		if (!opts.s3) {
			opts.s3 = ExS3.instance();
		}
		
		const signalStream = new Readable({
			objectMode: true,
			read() {
			},
		});
		
		if (files.length) {
			if (typeof files === 'string') {
				files = [files];
			}
			if (opts.mode && opts.mode === 'stream') {
				setImmediate(() => streamMode(opts.s3, files as string[], signalStream));
			} else {
				setImmediate(() => bufferMode(opts.s3, files as string[], signalStream));
			}
		} else {
			setImmediate(() => {
				signalStream.push(null);
			});
		}
		return signalStream;
	}
}

function streamMode(s3: ExS3, files: string[], stream: Readable) {
	(async () => {
		for (const file of files) {
			const loadStream = s3.downloadStream(file);
			stream.push(createVinylFile(join(temp, file), temp, loadStream));
			await streamPromise(loadStream);
		}
		stream.push(null);
	})().catch((e) => {
		stream.emit('error', pluginError('s3-upload', e));
	});
}

function bufferMode(s3: ExS3, files: string[], stream: Readable) {
	(async () => {
		for (const file of files) {
			const content = await new CollectingStream(s3.downloadStream(file)).promise();
			stream.push(createVinylFile(join(temp, file), temp, content));
		}
		stream.push(null);
	})().catch((e) => {
		stream.emit('error', e);
	});
}
