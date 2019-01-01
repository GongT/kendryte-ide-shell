import { BUILD_ARTIFACTS_DIR } from '../environment';
import { everyPlatform } from '../library/gulp';
import { compress7z } from '../library/gulp/7z';
import { cleanArtifactTask } from '../library/gulp/cleanup';
import { nativePath } from '../library/misc/pathUtil';
import { offlinePackageFileName } from '../library/paths/offlinePackages';
import { extractPackages } from './extract';
import { getPackagesExtractRoot } from './paths';

export const createZipFiles = everyPlatform('offpack:compress', [cleanArtifactTask, extractPackages], (platform) => {
	const extraTo = getPackagesExtractRoot(platform);
	return compress7z(
		nativePath(BUILD_ARTIFACTS_DIR, offlinePackageFileName(platform)),
		extraTo,
	);
});
