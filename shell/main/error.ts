import { remote } from 'electron';
import { DEVELOPER_PREVENT_START } from '../library/debug';
import { isBuilt } from '../library/environment';
import { logger } from '../library/logger';

// let lastRun: string;

export function rememberThisVersion(fsPath: string) {
	// lastRun = fsPath;
}

export class KnownFatalError extends Error {
}

export function handleError(error: Error) {
	if (error.message === DEVELOPER_PREVENT_START) {
		logger.action('Start prevented');
		logger.sub2('');
		return false;
	}
	if (!isBuilt) {
		debugger;
	}
	
	setTimeout(() => {
		throw error;
	}, 0);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		remote.getCurrentWebContents().openDevTools({mode: 'detach'});
		return false;
	}
	
	logger.error(error.stack);
	logger.progress(NaN);
	
	logger.action('Fail to Start', 'something wrong');
	logger.sub2(error.message);
	
	return false;
}
