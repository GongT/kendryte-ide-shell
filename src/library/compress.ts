import { extract } from '7zip-bin-wrapper';
import { logger } from './logger';

export async function un7z(from: string, to: string): Promise<void> {
	throw new Error('move single child to parent');
	console.log('unzip %s -> %s', from, to);
	const handler = extract(from, to);
	handler.on('output', (data: string) => {
		logger.debug(data);
	});
	handler.on('progress', ({progress, message}) => {
		logger.progress(progress);
		logger.sub(message);
	});
	
	await handler.promise();
	console.log('unzip ok');
}