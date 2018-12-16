import { logger } from '../library/logger';

export function handleError(error: Error) {
	console.error(error.stack);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		require('electron').remote.getCurrentWebContents().openDevTools({mode: 'detach'});
		return;
	}
	
	logger.error(error.stack);
	logger.sub1('Failed! Check log for more info.');
	logger.sub2(error.message);
	logger.progress(NaN);
}
