import { logger } from '../library/logger';

export function handleError(error: Error) {
	console.error(error.stack);
	if (!logger) {
		alert('Sorry, we run into a serious bug. please contact us to resolve.');
		require('electron').remote.getCurrentWebContents().openDevTools({mode: 'detach'});
		return;
	}
	
	logger.error(error.stack);
	logger.action('Error!', 'See log to more info\nPlease retry.');
}
