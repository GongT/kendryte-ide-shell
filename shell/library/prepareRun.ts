import { is } from 'electron-util';
import { tempDir } from './environment';

const invalidTemp = /[\[\]!|:*?"<>\s]/;
const windowsDriveLetter = /^[a-z]:/i;

export function prepareTempDir(): void {
	let tDir = tempDir().replace(windowsDriveLetter, '');
	if (invalidTemp.test(tDir)) {
		const invalid = invalidTemp.exec(tDir);
		throw new Error(`Your system temporary directory contains invalid character "${invalid}".\n(value is: ${tDir})`);
	}
	if (tDir.length > 64) {
		if (is.macos) {
			tDir = '/private/tmp';
		} else if (is.linux) {
			tDir = '/tmp';
		} else if (is.windows) {
			tDir = 'C:\\Windows\\Temp';
		}
		
		throw new Error(`Your system temporary directory is too long, will cause connection error.\n(value is: ${tDir})`);
	}
}
