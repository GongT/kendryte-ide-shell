import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import * as File from 'vinyl';
import { createVinylFile } from '../gulp';
import { ExS3 } from '../misc/awsUtil';
import { CollectingStream, streamPromise } from '../misc/streamUtil';

const temp = tmpdir();

export interface MimeSetter {
	(fileName: string): string;
}

class Uploader extends Transform {
	constructor(
		private readonly s3: ExS3,
	) {
		super({
			objectMode: true,
		});
	}
	
	private getMime(base: string) {
		if (/\.json$/.test(base)) {
			return {mime: 'application/json', hash: false};
		} else if (/\.html$/.test(base)) {
			return {mime: 'text/html', hash: false};
		} else {
			return {mime: 'application/octet-stream', hash: true};
		}
	}
	
	_transform(file: File, encoding: string, callback: Function) {
		if (file.isDirectory() || file.isSymbolic()) {
			callback();
		}
		const {mime, hash} = this.getMime(file.basename);
		if (file.isStream()) {
			this.s3.uploadStream(file.relative, mime, file.contents, hash).then(() => {
				callback();
			}, (e: Error) => {
				this.emit('error', e);
				callback(e);
			});
		} else if (file.isBuffer()) {
			this.s3.uploadBuffer(file.relative, mime, file.contents, hash).then(() => {
				callback();
			}, (e: Error) => {
				this.emit('error', e);
				callback(e);
			});
		} else {
			this.emit('error', new Error('failed to upload, not support null files'));
			callback();
		}
	}
}

export namespace gulpS3 {
	
	export interface DestOptions {
		s3?: ExS3;
	}
	
	export function dest(opts?: DestOptions): Transform {
		if (!opts) {
			opts = {};
		}
		if (!opts.s3) {
			opts.s3 = ExS3.instance();
		}
		
		return new Uploader(opts.s3);
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
		stream.emit('error', e);
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