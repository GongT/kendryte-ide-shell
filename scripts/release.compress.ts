import { everyPlatform, run } from './gulp';
import { releaseTasks } from './release.electron';
import { createReleaseTag } from './releaseTag';
import { getReleaseChannel } from './root';

export const compressTasks = everyPlatform('compress', [releaseTasks], (platform, root) => {
	const szCmd = [
		require('7zip-bin').path7za,
		'a',
		'-y',
		'-ms=on',
		'-mx8',
		'-mmt',
		'-ssc',
		`../updater.${getReleaseChannel()}.${createReleaseTag()}.${platform}.7z`,
		'KendryteIDE',
	].join(' ');
	return run(szCmd, {cwd: root})();
});
