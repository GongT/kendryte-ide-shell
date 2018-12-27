import { getReleaseChannel } from '../../environment';
import { createReleaseTag } from '../../task.kendryteShell/releaseTag';
import { IPlatformTypes } from '../gulp';

export function offlinePackageFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	return `offlinepackages.${getReleaseChannel()}.${platform}.7z`;
}
