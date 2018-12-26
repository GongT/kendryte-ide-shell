import { join } from 'path';
import { BUILD_ARTIFACTS_DIR, BUILD_ROOT_ABSOLUTE, getReleaseChannel } from '../library/environment';
import { everyPlatform, run } from '../library/gulp';
import { releaseTasks } from './release.electron';
import { createReleaseTag } from './releaseTag';

export function compressedFileName(platform: string) {
	return `updater.${getReleaseChannel()}.${createReleaseTag()}.${platform}.7z`;
}

export const compressTasks = everyPlatform('compress', [releaseTasks], (platform, root) => {
	const szCmd = [
		require('7zip-bin').path7za,
		'a',
		'-y',
		'-ms=on',
		'-mx8',
		'-mmt',
		'-ssc',
		join(BUILD_ROOT_ABSOLUTE, BUILD_ARTIFACTS_DIR, compressedFileName(platform)),
		'KendryteIDE',
	].join(' ');
	return run(szCmd, {cwd: root})();
});
