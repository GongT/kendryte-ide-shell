import { join } from 'path';
import { BUILD_ARTIFACTS_DIR, BUILD_ROOT_ABSOLUTE } from '../environment';
import { everyPlatform, log, run } from '../library/gulp';
import { updaterFileName } from '../library/paths/updater';
import { releaseTasks } from './release.electron';

export const compressTasks = everyPlatform('compress', [releaseTasks], (platform, root) => {
	const szCmd = [
		require('7zip-bin').path7za,
		'a',
		'-y',
		'-ms=on',
		'-mx8',
		'-mmt',
		'-ssc',
		join(BUILD_ROOT_ABSOLUTE, BUILD_ARTIFACTS_DIR, updaterFileName(platform)),
		'KendryteIDE',
	].join(' ');
	log.info('Compress: ' + szCmd);
	return run(szCmd, {
		cwd: root,
		quiet: true,
	})();
});
