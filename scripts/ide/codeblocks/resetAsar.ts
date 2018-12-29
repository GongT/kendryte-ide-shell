import { unlinkSync } from 'fs';
import { VSCODE_ROOT } from '../../environment';
import { log } from '../../library/gulp';
import { isExistsSync, isLinkSync } from '../../library/misc/fsUtil';
import { chdir } from '../../library/misc/pathUtil';
import { removeDirectory } from './removeDir';

export async function reset_asar() {
	chdir(VSCODE_ROOT);
	if (await isLinkSync('./node_modules')) {
		unlinkSync('./node_modules');
	}
	if (await isExistsSync('./node_modules.asar')) {
		unlinkSync('./node_modules.asar');
	}
	if (await isExistsSync('./node_modules.asar.unpacked')) {
		await removeDirectory('./node_modules.asar.unpacked');
	}
	log('cleanup ASAR files.\n');
}
