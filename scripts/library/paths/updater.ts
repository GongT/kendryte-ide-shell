import { getReleaseChannel } from '../../environment';
import { createReleaseTag } from '../../task.kendryteShell/releaseTag';
import { IPlatformTypes } from '../gulp';

export function updaterFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	return `updater.${getReleaseChannel()}.${releaseTag}.${platform}.7z`;
}
