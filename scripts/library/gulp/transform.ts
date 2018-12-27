import File = require('vinyl');
import { Transform } from 'stream';
import { pluginError } from '../gulp';

export function streamTransform(
	trans: (file: File) => Promise<File>|File,
	title: string = 'simple-transform',
) {
	return new class GulpTransform extends Transform {
		constructor() {
			super({objectMode: true});
		}
		
		_transform(file: File, _: any, callback: Function) {
			Promise.resolve(trans(file)).then((f) => {
				this.push(f);
				callback();
			}, (e) => {
				callback(pluginError(title, e));
			});
		}
	};
}