import { join } from 'path';
import { VinylFile } from '../gulp';

export function wrapGlob(rel: string, glob: string[]|string): string[] {
	if (!Array.isArray(glob)) {
		glob = [glob];
	}
	return glob.map((g) => {
		return join(rel, g);
	});
}

export function startsWithFolder(file: VinylFile, dirName: string) {
	const relative = file.relative;
	return relative === dirName || relative.startsWith(dirName + '/') || relative.startsWith(dirName + '\\');
}
