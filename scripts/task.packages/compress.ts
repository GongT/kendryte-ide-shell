import { join } from 'path';
import { BUILD_ARTIFACTS_DIR, BUILD_ROOT } from '../environment';
import { everyPlatform, log, run } from '../library/gulp';
import { offlinePackageFileName } from '../library/paths/offlinePackages';
import { cleanArtifactTask } from '../task.kendryteShell/cleanup';
import { extractPackages } from './extract';
import { getPackagesExtractRoot } from './paths';

export const createZipFiles = everyPlatform('offpack:compress', [cleanArtifactTask, extractPackages], (platform) => {
	const extraTo = getPackagesExtractRoot(platform);
	const szCmd = [
		require('7zip-bin').path7za,
		'a',
		'-y',
		'-ms=on',
		'-mx8',
		'-mmt',
		'-ssc',
		join(BUILD_ROOT, BUILD_ARTIFACTS_DIR, offlinePackageFileName(platform)),
		'*',
	].join(' ');
	log.info(`Compress: ${szCmd}(${extraTo})`);
	return run(szCmd, {
		cwd: extraTo,
		quiet: true,
	})();
});
