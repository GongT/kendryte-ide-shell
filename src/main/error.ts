import { remote } from 'electron';
import { DEVELOPER_PREVENT_START } from '../library/debug';
import { myArgs } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { launchIDE, resolveExecutable } from './launch';

export function handleError(error: Error) {
	if (error.message === DEVELOPER_PREVENT_START) {
		logger.action('Start prevented');
		logger.sub2('');
		return false;
	}
	debugger;
	
	setTimeout(() => {
		throw error;
	}, 0);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		require('electron').remote.getCurrentWebContents().openDevTools({mode: 'detach'});
		return false;
	}
	
	logger.error(error.stack);
	logger.action('Fail to Start', 'try to start latest working version.');
	logger.progress(NaN);
	
	finalTry(error.stack);
	
	return false;
}

function finalTry(sub2: string) {
	readLocalVersions().then(async (versions) => {
		if (versions && versions.length) {
			const lastVersion = versions.pop();
			
			logger.sub2('try start previous version: ' + lastVersion);
			
			const exe = await resolveExecutable(lastVersion.fsPath);
			
			await launchIDE(exe, remote.process.cwd(), myArgs(), {
				VSCODE_PATH: lastVersion.fsPath,
			});
			// launchIDE will trigger event to show other thing, nothing to do there
		} else {
			throw new Error('no installed version to try');
		}
	}).catch((e) => {
		console.error('Error while final try: ', e);
		logger.action('Fail to Start', e.message);
		logger.sub2('Sorry, please report this to us.');
	});
}