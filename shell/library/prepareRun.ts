import { KnownFatalError } from '../main/error';
import { tempDir } from './environment';

const invalidTemp = /[\[\]!|:*?"<>\s]/;
const windowsDriveLetter = /^[a-z]:/i;

export function prepareRun() {
	const tempdir = tempDir().replace(windowsDriveLetter, '');
	if (invalidTemp.test(tempdir)) {
		const invalid = invalidTemp.exec(tempdir);
		throw new KnownFatalError(`Your system temporary directory contains invalid character "${invalid}".\n(value is: ${tempdir})`);
	}
	if (tempdir.length > 64) {
		throw new KnownFatalError(`Your system temporary directory is too long, will cause connection error.\n(value is: ${tempdir})`);
	}
}
