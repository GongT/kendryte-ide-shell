import { BUILD_ARTIFACTS_DIR, BUILD_ROOT } from '../../environment';
import { IPlatformTypes } from '../gulp';
import { IPackageJson } from '../jsonDefine/package.json';
import { ExS3 } from '../misc/awsUtil';
import { nativePath } from '../misc/pathUtil';
import { getReleaseChannel } from '../releaseInfo/qualityChannel';

export function ideDownloadKey(packageJson: IPackageJson, platform: IPlatformTypes) {
	return `release/${getReleaseChannel()}/v${packageJson.version}/IDE.${packageJson.patchVersion}.${platform}.7z`;
}

export function patchDownloadKey(packageJson: IPackageJson, platform: IPlatformTypes) {
	return `release/${getReleaseChannel()}/v${packageJson.version}/Patch.${packageJson.patchVersion}.${platform}.tar.gz`;
}

export function artifactsS3TempUrl(platform: string) {
	return ExS3.instance().websiteUrl(`pipeline-artifacts/latest-${platform}.7z`);
}

export function artifactsLocalTempPath(platform: string, type: 'latest'|'prev') {
	return nativePath(BUILD_ARTIFACTS_DIR, `artifact-${type}-${platform}.7z`);
}

export function artifactsExtractedTempPath(platform: string, type: 'latest'|'prev') {
	return extractTempDir(`${type}-${platform}`);
}

export function extractTempDir(...resolve: string[]) {
	return nativePath(BUILD_ROOT, `artifact-merge-temp`, ...resolve);
}
