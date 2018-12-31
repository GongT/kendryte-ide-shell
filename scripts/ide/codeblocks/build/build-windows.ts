import { resolve } from 'path';
import { RELEASE_ROOT } from '../../../environment';

export async function windowsBuild() {
	const compiledResult = resolve(RELEASE_ROOT, 'VSCode-win32-x64');
	
	return compiledResult;
}
