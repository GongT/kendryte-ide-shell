import { S3 } from 'aws-sdk';
import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import { AWS_ACCESS_KEY_ID, AWS_BUCKET, AWS_REGION, AWS_SECRET_ACCESS_KEY } from '../../environment';
import { ICompileOptions } from '../../ide/package-manager/type';
import { log } from '../gulp';
import { ProgressPromise } from './asyncUtil';
import { getPackageData, getProductData } from './fsUtil';
import { hashBuffer, hashStream } from './hashUtil';
import { CollectingStream } from './streamUtil';

export interface AWSLogger {
	write?: (chunk: any, encoding?: string, callback?: () => void) => void
	log?: (...messages: any[]) => void;
}

export const OBJKEY_IDE_JSON = 'release/IDE.' + getProductData().quality + '.json';
export const OBJKEY_DOWNLOAD_INDEX = 'release/download/index.html';
export const OBJKEY_PACKAGE_MANAGER_LIBRARY = 'package-manager/registry/library.json';
export const OBJKEY_PACKAGE_MANAGER_EXAMPLE = 'package-manager/registry/example.json';

export interface IProgress {
	loaded: number;
	total: number;
}

export interface S3Upload<T> {
	mime: string;
	stream: T;
}

export class ExS3 implements AWSLogger {
	private readonly bucket: string;
	private readonly s3: S3;
	private static static_s3: ExS3;
	
	constructor() {
		s3AssertConfig();
		this.bucket = AWS_BUCKET;
		
		this.s3 = new S3({
			region: AWS_REGION,
			credentials: {
				accessKeyId: AWS_ACCESS_KEY_ID,
				secretAccessKey: AWS_SECRET_ACCESS_KEY,
			},
			logger: this,
		});
	}
	
	static instance() {
		if (ExS3.static_s3) {
			return ExS3.static_s3;
		} else {
			return ExS3.static_s3 = new ExS3;
		}
	}
	
	get config() {
		return this.s3.config;
	}
	
	url(key: string) {
		key = key.replace(/^\//, '');
		const {region} = this.s3.config;
		const top = region.startsWith('cn-')? '.cn' : '';
		return `http://s3.${region}.amazonaws.com${top}/${this.bucket}/${key}`;
	}
	
	websiteUrl(key: string) {
		key = key.replace(/^\//, '');
		const {region} = this.s3.config;
		const top = region.startsWith('cn-')? '.cn' : '';
		return `http://${this.bucket}.s3-website.${region}.amazonaws.com${top}/${key}`;
	}
	
	write(...messages: any[]) {
		log('write', ...messages);
	}
	
	log(...messages: any[]) {
		log('log', ...messages);
	}
	
	loadText(key: string): Promise<string> {
		// globalLog('[S3] getText -> %s :: %s', Bucket, Key);
		return new CollectingStream(this.downloadStream(key)).promise();
	}
	
	async loadJson<T>(key: string): Promise<T> {
		// globalLog('[S3] getJson -> %s :: %s', Bucket, Key);
		const json = await new CollectingStream(this.downloadStream(key)).promise();
		return (void 0 || eval)('data=' + json + ';');
	}
	
	downloadStream(key: string): NodeJS.ReadableStream {
		// log('[S3] download <- %s :: %s', this.bucket, key);
		return this.s3.getObject(
			{Bucket: this.bucket, Key: key},
		).createReadStream();
	}
	
	putText(
		key: string,
		text: string,
		mime = 'text/plain',
	) {
		return this.uploadBuffer(key, mime + '; charset=utf-8', text, false);
	}
	
	putJson(
		key: string,
		data: any,
	): Promise<string> {
		return this.uploadBuffer(
			key,
			'application/json; charset=utf-8',
			Buffer.from(JSON.stringify(data, null, 2) + '\n', 'utf8'),
			false,
		);
	}
	
	async uploadLocalFile(
		key: string,
		mime: string,
		fileName: string,
	) {
		return this.uploadStream(key, mime, createReadStream(fileName), true);
	}
	
	async uploadBuffer(
		key: string,
		mime: string,
		buffer: string|Buffer,
		hash = true,
	) {
		// globalLog('[S3] upload -> %s :: %s', Bucket, Key);
		const url = await new Promise<string>((resolve, reject) => {
			this.s3.upload(
				{ACL: 'public-read', Bucket: this.bucket, Key: key, Body: buffer, ContentType: mime},
				{partSize: 10 * 1024 * 1024, queueSize: 4},
				(err: Error, data: any) => err? reject(err) : resolve(data.Location),
			);
		});
		
		if (hash) {
			await this.putText(key + '.md5', hashBuffer(buffer));
		}
		
		return url;
	}
	
	async uploadStream(
		key: string,
		mime: string,
		stream: NodeJS.ReadableStream,
		hash = true,
	) {
		// globalLog('[S3] upload -> %s', key);
		const pass = stream.pipe(new PassThrough());
		
		let hashPromise: Promise<string>;
		if (hash) {
			hashPromise = hashStream(pass);
		}
		
		const url = await new ProgressPromise<string, IProgress>((resolve, reject, notify) => {
			const mup = this.s3.upload(
				{ACL: 'public-read', Bucket: this.bucket, Key: key, Body: stream, ContentType: mime},
				{partSize: 10 * 1024 * 1024, queueSize: 4},
				(err: Error, data: any) => err? reject(err) : resolve(data.Location),
			);
			
			mup.on('httpUploadProgress', ({loaded, total}: any) => {
				notify({loaded, total});
			});
		});
		
		if (hash) {
			const hashValue = await hashPromise;
			await this.putText(key + '.md5', hashValue);
		}
		
		return url;
	}
}

function s3AssertConfig() {
	if (!AWS_REGION) {
		throw new Error('AWS S3 credentials error: must set variable AWS_REGION');
	} else if (!AWS_ACCESS_KEY_ID) {
		throw new Error('AWS S3 credentials error: must set variable AWS_ACCESS_KEY_ID');
	} else if (!AWS_SECRET_ACCESS_KEY) {
		throw new Error('AWS S3 credentials error: must set variable AWS_SECRET_ACCESS_KEY');
	} else if (!AWS_BUCKET) {
		throw new Error('AWS S3 credentials error: must set variable AWS_BUCKET');
	} else {
		return;
	}
}

export function calcReleaseFileAwsKey(platform: string, type: string): string {
	const product = getProductData();
	const packageJson = getPackageData();
	
	const pv = parseFloat(packageJson.patchVersion).toFixed(6).replace(/\./g, '');
	return `release/download/${product.quality}/v${packageJson.version}/${pv}/${platform}.${type}`;
}

export function calcUpdaterAwsKey(platform: string, type: string): string {
	const product = getProductData();
	
	return `release/updater/${product.quality}.${platform}.${type}`;
}

export function calcPackageAwsKey(platform: string, type: string): string {
	const product = getProductData();
	return `release/offlinepackages/${product.quality}/${platform}.offlinepackages.${type}`;
}

export function calcPatchFileAwsKey(platform: string): string {
	const product = getProductData();
	const packageJson = getPackageData();
	
	const pv = parseFloat(packageJson.patchVersion).toFixed(6).replace(/\./g, '');
	return `release/patches/${product.quality}/v${packageJson.version}/${pv}/${platform}.tar.gz`;
}

export function calcLibraryFileAwsKey(data: ICompileOptions): string {
	return `package-manager/${data.type}/${data.name}/${data.version}.tar.gz`;
}
