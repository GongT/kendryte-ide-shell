import { IPlatformMap, IPlatformTypes } from '../library/gulp';
import { ExS3 } from '../library/misc/awsUtil';
import { resolveUrl } from '../library/misc/pathUtil';
import { thirdRegistry } from './registry';

export interface IThirdPartyRegistryPlatform {
	version?: string;
	download: string;
}

export interface IThirdPartyRegistryItem extends IPlatformMap<IThirdPartyRegistryPlatform> {
	projectName: string;
	version: string;
	source: string;
}

export type IThirdPartyRegistry = ReadonlyArray<IThirdPartyRegistryItem>;

export interface IRegistryDownloadInfo {
	name: string;
	version: string;
	platform: string;
	url: string;
}

export function walkRegistry(platform: IPlatformTypes): ReadonlyArray<IRegistryDownloadInfo> {
	return thirdRegistry.map((item) => {
		let url: string;
		if (item[platform]) {
			url = item[platform].download || item.source;
		} else {
			url = item.source;
		}
		if (!url) {
			return null;
		}
		
		url = resolveUrl(ExS3.instance().websiteUrl('3rd-party/versions.json'), url);
		
		let version: string;
		if (item[platform]) {
			version = item[platform].version || item.version;
		} else {
			version = item.version;
		}
		
		return {name: item.projectName, platform, version, url};
	}).filter(e => !!e);
}

export function getBundledVersions(platform: IPlatformTypes) {
	const bundledVersions: {[name: string]: string} = {};
	
	walkRegistry(platform).forEach(({name, version}) => {
		bundledVersions[name] = version;
	});
	
	return bundledVersions;
}
