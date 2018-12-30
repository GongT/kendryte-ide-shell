import { join } from 'path';

export function wrapGlob(rel: string, glob: string[]|string): string[] {
	if (!Array.isArray(glob)) {
		glob = [glob];
	}
	return glob.map((g) => {
		return join(rel, g);
	});
}
