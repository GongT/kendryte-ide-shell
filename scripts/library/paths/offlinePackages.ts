import { createReleaseTag } from '../releaseInfo/releaseTag';
import { IPlatformTypes } from '../gulp';
import { getReleaseChannel } from '../releaseInfo/qualityChannel';

export function offlinePackageFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	return `offlinepackages.${getReleaseChannel()}.${platform}.7z`;
}
