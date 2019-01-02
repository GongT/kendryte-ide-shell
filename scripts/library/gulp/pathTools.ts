import { VinylFile } from '../gulp';

export function removeFirstComponent(f: VinylFile) {
	f.dirname = f.dirname.replace(/^[^\/\\]+/, '').replace(/^[\/\\]/, '') || '.';
}
