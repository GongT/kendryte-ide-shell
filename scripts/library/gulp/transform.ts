import File = require('vinyl');
import { Transform } from 'stream';
import { pluginError } from '../gulp';

export function simpleTransformStream(
	trans: (file: File) => Promise<File>|File,
	title?: string,
): Transform {
	if (!title) {
		if ((trans as any).title) {
			title = (trans as any).title;
		} else {
			title = 'simple-transform';
		}
	}
	return new class GulpTransform extends Transform {
		constructor() {
			super({objectMode: true});
		}
		
		_transform(file: File, _: any, callback: Function) {
			Promise.resolve(trans(file)).then((f) => {
				if (f) {
					this.push(f);
				}
				callback();
			}, (e) => {
				callback(pluginError(title, e));
			});
		}
	};
}
