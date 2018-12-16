import { extract } from '7zip-bin-wrapper';
import { copy, lstat, readdir, rename } from 'fs-extra';
import { tmpdir } from 'os';
import { basename } from 'path';
import { nativePath } from './environment';
import { logger } from './logger';
import { removeDirectory } from './removeDirectory';

export async function un7z(from: string, to: string): Promise<void> {
	logger.debug(`unzip ${from} -> ${to}`);
	await removeDirectory(to);
	
	const handler = extract(from, to);
	handler.on('output', (data: string) => {
		logger.debug(data);
	});
	handler.on('progress', ({progress, message}) => {
		logger.progress(progress);
		logger.sub1(progress.toFixed(0) + '%');
		logger.sub2(message);
	});
	
	await handler.promise();
	
	const content: string[] = (await readdir(to)).filter(file => !file.startsWith('.'));
	if (content.length === 1) {
		const onlyChild = nativePath(to, content[0]);
		logger.debug(`only child: ${onlyChild}`);
		logger.sub1('post processing...');
		if ((await lstat(onlyChild)).isDirectory()) {
			logger.debug(`rename(${onlyChild}, ${to}.rename-temp)`);
			await rename(onlyChild, to + '.rename-temp');
			logger.debug(`removeDirectory(${to})`);
			await removeDirectory(to);
			logger.debug(`rename(${to}.rename-temp, ${to})`);
			await rename(to + '.rename-temp', to);
		} else if (onlyChild.endsWith('.tar')) {
			const temp = nativePath(tmpdir(), basename(onlyChild));
			logger.debug(`copy(${onlyChild}, ${temp})`);
			await copy(onlyChild, temp);
			logger.debug(`removeDirectory(${to})`);
			await removeDirectory(to);
			logger.debug(`un7z(${temp}, ${to})`);
			await un7z(temp, to);
		}
	} else {
		logger.debug(`child dirs: ${content.join(', ')}`);
	}
	logger.sub1('100%');
	logger.sub2('unzip complete');
}