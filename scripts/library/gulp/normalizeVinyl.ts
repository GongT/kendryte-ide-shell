import { VinylFile } from '../gulp';
import { simpleTransformStream } from './transform';

export function normalizeVinyl() {
	return simpleTransformStream((f) => {
		const file = new VinylFile({
			stat: f.stat,
			base: f.base,
			path: f.path,
			history: [...f.history],
			contents: f.contents,
		});
		if (f.symlink) {
			file.symlink = f.symlink;
		}
		return file;
	});
}