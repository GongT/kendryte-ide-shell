import { debug } from '../gulp';
import { simpleTransformStream } from './transform';
import File = require('vinyl');

export function dumpDebug(title: string) {
	const sp = debug({title: 'input'});
	return simpleTransformStream((o: File) => {
		sp.write(o);
		debugger;
		return o;
	}, 'dump-debug');
}
