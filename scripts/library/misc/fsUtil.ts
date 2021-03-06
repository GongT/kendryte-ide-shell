import {
	close as closeAsync,
	existsSync,
	lstat as lstatAsync,
	lstatSync,
	mkdirSync,
	open as openAsync,
	readFile as readFileAsync,
	readFileSync,
	readlink as readlinkAsync,
	rename as renameAsync,
	rmdir as rmdirAsync,
	Stats,
	unlink as unlinkAsync,
	writeFile as writeFileAsync,
} from 'fs';
import { remove } from 'fs-extra';
import { resolve } from 'path';
import { promisify } from 'util';
import { VSCODE_ROOT } from '../../environment';
import { IPackageJson } from '../jsonDefine/package.json';
import { IProductJson } from '../jsonDefine/product.json';

export function mkdirpSync(p: string) {
	if (!p) {
		throw new Error('path must not empty string');
	}
	if (!existsSync(p)) {
		mkdirpSync(resolve(p, '..'));
		mkdirSync(p);
	}
}

export function isLinkSync(path: string) {
	try {
		return lstatSync(path).isSymbolicLink();
	} catch (e) {
		return false;
	}
}

export async function isExists(path: string) {
	try {
		return !!await lstat(path);
	} catch (e) {
		return false;
	}
}

export function isExistsSync(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch (e) {
		return false;
	}
}

export function lstat(p: string): Promise<Stats> {
	return new Promise((resolve, reject) => {
		lstatAsync(p, (err, stats) => {
			if (err && err.code !== 'ENOENT') {
				return reject(err);
			}
			return resolve(stats);
		});
	});
}

export function readFile(path: string): Promise<string> {
	return new Promise((resolve, reject) => {
		readFileAsync(path, 'utf8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
}

export function writeFile(path: string, data: Buffer|string): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFileAsync(path, data, 'utf8', (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

/**@deprecated*/export const unlink = promisify(unlinkAsync);
/**@deprecated*/export const rmdir = promisify(rmdirAsync);
/**@deprecated*/export const open = promisify(openAsync);
/**@deprecated*/export const close = promisify(closeAsync);
/**@deprecated*/export const rename = promisify(renameAsync);
/**@deprecated*/export const readlink = promisify(readlinkAsync);

const cache: {[fn: string]: any} = {};

export function getProductData(alterRoot: string = VSCODE_ROOT): IProductJson {
	const productFile = resolve(alterRoot, 'product.json');
	if (cache[productFile]) {
		return cache[productFile];
	}
	try {
		const jsonData = readFileSync(productFile, 'utf8');
		return cache[productFile] = JSON.parse(jsonData);
	} catch (e) {
		throw new Error(`Failed to load product.json: ${e.message}`);
	}
}

export function getPackageData(alterRoot: string = VSCODE_ROOT): IPackageJson {
	const packageFile = resolve(alterRoot, 'package.json');
	if (cache[packageFile]) {
		return cache[packageFile];
	}
	try {
		const jsonData = readFileSync(packageFile, 'utf8');
		return cache[packageFile] = JSON.parse(jsonData);
	} catch (e) {
		throw new Error(`Failed to load package.json: ${e.message}`);
	}
}

export async function removeIfExists(file: string) {
	if (await isExists(file)) {
		await remove(file);
	}
}

export function pPath(p: string): string {
	return p.replace(/\\/g, '/');
}