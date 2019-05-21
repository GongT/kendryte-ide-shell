import { resolve } from 'path';
import { Transform } from 'stream';
import { dest, src } from 'vinyl-fs';
import { streamPromise } from './streamPromise';

export function ecopy(source: string, target: string) {
	// copy use vinyl fs, prevent error around ".asar" files
	console.log('~~~~~ %s\n%s', source, target);
	return streamPromise(
		src(source + '/**', {
			base: source + '/',
			cwd: source,
			removeBOM: false,
			resolveSymlinks: false,
			dot: true,
		})
			.pipe(new Rename(target))
			.pipe(dest(target, {
				cwd: target,
				relativeSymlinks: false,
			})),
	);
}

class Rename extends Transform {
	constructor(
		private readonly base: string,
	) {
		super({objectMode: true});
	}
	
	_transform(file: any, _: any, callback: Function) {
		if (file.isDirectory()) {
			callback();
			return;
		}
		file.path = resolve(this.base, file.relative);
		file.base = this.base;
		file.cwd = this.base;
		
		this.push(file);
		callback();
	}
}
