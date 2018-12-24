import { remote } from 'electron';
import { myArgs } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { launchIDE, resolveExecutable } from './launch';

export function handleError(error: Error) {
	console.error(error.stack);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		require('electron').remote.getCurrentWebContents().openDevTools({mode: 'detach'});
		return false;
	}
	
	logger.error(error.stack);
	logger.sub1('Failed! Check log for more info.');
	logger.sub2(error.message);
	logger.progress(NaN);
	
	finalTry();
	
	return false;
}

function finalTry() {
	readLocalVersions().then(async (versions) => {
		if (versions && versions.length) {
			
			const lastVersion = versions.pop();
			if (!lastVersion) {
				return;
			}
			
			const exe = await resolveExecutable(lastVersion.fsPath);
			
			await launchIDE(exe, remote.process.cwd(), myArgs(), {
				VSCODE_PATH: lastVersion.fsPath,
			});
		}
	}).catch((e) => {
		console.error('Error while final try: ', e);
	});
}