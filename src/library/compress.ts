import { logger } from './logger';
import { extract } from '7zip-bin-wrapper';

export function un7z(from: string, to: string): Promise<void> {
	logger.action('Extract');
	logger.sub('');

	const handler = extract(from, to);
	handler.on('output', (data: string) => {
		logger.debug(data);
	});
	handler.on('progress', ({ progress, message }) => {
		logger.progress(progress);
		logger.sub(message);
	});

	return handler.promise();
}