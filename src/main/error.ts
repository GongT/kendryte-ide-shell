import { logger } from '../library/logger';

export function handleError(error: Error) {
	console.error(error);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		require('electron').remote.getCurrentWebContents().openDevTools({ mode: 'detach' });
		return;
	}

	logger.debug(error.stack);
	logger.error(error.message);
	logger.sub('please retry.');
}