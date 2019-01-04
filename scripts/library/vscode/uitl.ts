///<reference path="event-stream.d.ts"/>

import * as _rimraf from 'rimraf';

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
