import { createReleaseTag } from '../releaseInfo/releaseTag';
import { IPlatformTypes } from '../gulp';
import { getReleaseChannel } from '../releaseInfo/qualityChannel';

export function updaterFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	return `updater.${getReleaseChannel()}.${releaseTag}.${platform}.7z`;
}
