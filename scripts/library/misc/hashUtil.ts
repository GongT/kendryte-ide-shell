import { createHash } from 'crypto';

export function hashBuffer(buffer: string|Buffer): string {
	const hash = createHash('md5');
	if (Buffer.isBuffer(buffer)) {
		hash.update(buffer);
	} else {
		hash.update(buffer, 'utf8');
	}
	return hash.digest().toString('hex').toLowerCase();
}

export function hashStream(stream: NodeJS.ReadableStream): Promise<string> {
	const hasher = createHash('md5');
	stream.pipe(hasher);
	
	return new Promise((resolve, reject) => {
		hasher.on('error', reject);
		stream.on('error', reject);
		
		hasher.on('data', (data: Buffer) => {
			resolve(data.toString('hex').toLowerCase());
		});
	});
}
