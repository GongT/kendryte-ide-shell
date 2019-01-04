import { simpleTransformStream } from './transform';

export function skipDirectories(): NodeJS.ReadWriteStream {
	return simpleTransformStream(f => {
		if (f.isSymbolic()) {
			return f;
		}
		if (f.isDirectory()) {
			return void 0;
		}
		return f;
	});
}
