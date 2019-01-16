import { basename } from 'path';
import { ILocalStatus } from '../library/localVersions';
import { willRemove } from '../library/removeDirectory';
import { workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';

export function downloadMain(targetPath: string, url: string) {
	const filename = basename(targetPath);
	workTitle('Installing', filename);
	downloadAndExtract(url, targetPath, 'IDE');
}

export function migrateUserData(backupVersion: string) {
	/*workTitle('Backup', backupVersion);
	registerWork('backup user data', async () => {
		const latestUserData = userDataPath('latest');
		logger.debug('latest user data = ' + latestUserData);
		logger.debug('backup user data = ' + userDataPath(backupVersion));
		await copy(latestUserData, userDataPath(backupVersion));
	});*/
}

export function uninstallOldVersion(localVersions: ILocalStatus[]) {
	while (localVersions.length > 3) {
		const item = localVersions.shift();
		workTitle('Uninstalling', 'too old version: ' + item.version);
		willRemove(item.fsPath);
	}
}
