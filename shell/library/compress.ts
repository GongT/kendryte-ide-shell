import { extract, extractSfx, I7zHandler } from '7zip-bin-wrapper';
import { is } from 'electron-util';
import { copy, lstat, readdir, rename } from 'fs-extra';
import { tmpdir } from 'os';
import { basename } from 'path';
import { nativePath } from './environment';
import { logger } from './logger';
import { removeDirectory } from './removeDirectory';
import { timeout } from './timeout';

export async function runSfx(from: string, to: string, clear = true): Promise<void> {
	logger.debug(`unzip(sfx) ${from} -> ${to}`);
	if (clear) {
		await removeDirectory(to);
	}
	
	const handler = extractSfx(from, to);
	await waitHandle(handler);
	
	if (nativePath(to).endsWith('.app')) {
		logger.debug(`    - is like macos app, no test only child.`);
	} else {
		await onlyChild(to);
	}
}

export async function un7z(from: string, to: string, clear = true): Promise<void> {
	logger.debug(`unzip ${from} -> ${to}`);
	if (clear) {
		await removeDirectory(to);
	}
	await timeout(is.windows? 5000 : 1000);
	
	const handler = extract(from, to);
	await waitHandle(handler);
	
	if (nativePath(to).endsWith('.app')) {
		logger.debug(`    - is like macos app, no test only child.`);
	} else {
		await onlyChild(to);
	}
	
	logger.sub1('100%');
	logger.sub2('unzip complete');
}

function waitHandle(handler: I7zHandler) {
	logger.debug(handler.commandline.join(' '));
	handler.on('output', (data: string) => {
		logger.debug(data);
	});
	handler.on('progress', ({progress, message}) => {
		logger.progress(progress);
		logger.sub1(progress.toFixed(0) + '%');
		logger.sub2(message);
	});
	
	return handler.promise();
}

export async function onlyChild(to: string) {
	logger.sub1('99.9%');
	const content: string[] = (await readdir(to)).filter(file => !file.startsWith('.'));
	if (content.length === 1) {
		const onlyChild = nativePath(to, content[0]);
		logger.debug(`only child: ${onlyChild}`);
		logger.sub1('post processing...');
		if ((await lstat(onlyChild)).isDirectory()) {
			await removeDirectory(to + '.rename-temp');
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
}
