import * as es from 'event-stream';
import * as _rimraf from 'rimraf';
import * as VinylFile from 'vinyl';

export function rimraf(dir: string): (cb: any) => void {
	let retries = 0;
	
	const retry = (cb: (err?: any) => void) => {
		_rimraf(dir, {maxBusyTries: 1}, (err: any) => {
			if (!err) {
				return cb();
			}
			
			if (err.code === 'ENOTEMPTY' && ++retries < 5) {
				return setTimeout(() => retry(cb), 10);
			}
			
			return cb(err);
		});
	};
	
	return cb => retry(cb);
}

export function skipDirectories(): NodeJS.ReadWriteStream {
	return es.mapSync<VinylFile, VinylFile|undefined>(f => {
		if (!f.isDirectory()) {
			return f;
		}
	});
}
