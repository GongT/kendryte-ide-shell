import { IPlatformTypes } from '../gulp';
import { getReleaseChannel } from '../releaseInfo/qualityChannel';
import { createReleaseTag } from '../releaseInfo/releaseTag';

export function updaterFileName(platform: IPlatformTypes|'*', releaseTag = createReleaseTag()) {
	const extension = platform === 'darwin'? 'zip' : '7z';
	return `updater.${getReleaseChannel()}.${releaseTag}.${platform}.${extension}`;
}
