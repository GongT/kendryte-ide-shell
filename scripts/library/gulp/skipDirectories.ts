import { simpleTransformStream } from './transform';

export function skipDirectories(): NodeJS.ReadWriteStream {
	return simpleTransformStream(f => {
		if (f.stat && f.stat.isSymbolicLink()) {
			return f;
		}
		if (f.isDirectory()) {
			return void 0;
		}
		return f;
	});
}
