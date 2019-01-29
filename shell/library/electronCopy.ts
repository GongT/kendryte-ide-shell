import { Transform } from 'stream';
import { dest, src } from 'vinyl-fs';
import { streamPromise } from './streamPromise';

export function ecopy(source: string, target: string) {
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
				relativeSymlinks: true,
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
		file.base = this.base;
		file.path = file.path.replace(file.cwd, this.base);
		file.cwd = this.base;
		
		this.push(file);
		callback();
	}
}