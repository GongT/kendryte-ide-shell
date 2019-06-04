import { BUILD_ARTIFACTS_DIR } from '../environment';
import { everyPlatform, log, run } from '../library/gulp';
import { resolvePath } from '../library/misc/pathUtil';
import { updaterFileName } from '../library/paths/updater';
import { releaseTasks } from './release.electron';

export const compressTasks = everyPlatform('release:compress', [releaseTasks], (platform, root) => {
	const szCmdArr = [
		require('7zip-bin').path7za,
		'a',
		'-y',
		'-ms=on',
		'-mx8',
		'-mmt',
		'-ssc',
	];
	if (platform === 'darwin') {
		szCmdArr.push('-tzip');
	}
	szCmdArr.push(
		resolvePath(BUILD_ARTIFACTS_DIR, updaterFileName(platform)),
		'KendryteIDE',
	);

	const szCmd = szCmdArr.join(' ');
	log.info('Compress: ' + szCmd);
	return run(szCmd, {
		cwd: root,
		quiet: true,
	})();
});
