import { IPlatformTypes } from '../gulp';
import { createReleaseTag } from '../releaseInfo/releaseTag';

export function offlinePackageFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	return `offlinepackages.${platform}.7z`;
}
