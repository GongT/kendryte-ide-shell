import { ensureDir, pathExists, readFile, readJson, writeFile, writeJson } from 'fs-extra';
import { resolve as resolveUrl } from 'url';
import { localPackagePath, nativePath } from '../library/environment';
import { logger } from '../library/logger';
import { loadJson } from '../library/network';
import { willRemove } from '../library/removeDirectory';
import { registerWork, workTitle } from '../library/work';
import { downloadAndExtract } from './downloadAndExtract';
import { SYS_NAME } from './release.json';

const CONTENT_PACKAGE_OK = 'install-ok:v0.0.0';

export type IThirdPartyRegistry = ReadonlyArray<{
	projectName: string;
	version: string;
	source: string;
	windows: {
		version: string;
		download: string;
	};
	linux: {
		version: string;
		download: string;
	};
	mac: {
		version: string;
		download: string;
	};
}>

interface VersionMap<AS = string> {
	[name: string]: AS;
}

export async function upgradeLocalPackages(remote: string) {
	registerWork(() => {
		return ensureDir(localPackagePath('.'));
	});
	
	logger.debug('Get thirdParty:' + remote);
	const thirdParty = await loadJson<IThirdPartyRegistry>(remote);
	
	const bvFile = localPackagePath('bundled-versions.json');
	const bundleVersion: VersionMap = await pathExists(bvFile)
		? await readJson(bvFile)
		: {};
	const remoteVersion: VersionMap<{version: string, url: string}> = {};
	for (const item of thirdParty) {
		let version = item.version;
		if (item[SYS_NAME] && item[SYS_NAME].version) {
			version = item[SYS_NAME].version;
		}
		
		let url;
		
		if (item[SYS_NAME] && item[SYS_NAME].download) {
			url = resolveUrl(remote, item[SYS_NAME].download);
		} else if (item.source) {
			url = resolveUrl(remote, item.source);
		}
		
		remoteVersion[item.projectName] = {
			version: '' + version,
			url: '' + url,
		};
	}
	
	for (const name of Object.keys(bundleVersion)) {
		if (!remoteVersion[name]) {
			workTitle('Uninstalling', 'redundant package: ' + name);
			willRemove(localPackagePath(name));
			delete bundleVersion[name];
		}
	}
	
	for (const [name, {version, url}] of Object.entries(remoteVersion)) {
		const pkgPath = localPackagePath(name);
		const ifOk = nativePath(pkgPath, '.install-ok');
		if (!await isInstallOk(ifOk)) {
			console.log('Missing Required Package: ' + name);
		} else if (bundleVersion[name] !== version) {
			console.log(`Update Required Package: ${name} (from ${bundleVersion[name]} to ${version})`);
			workTitle(`Removing ${name}`, pkgPath);
			willRemove(pkgPath);
		} else {
			logger.debug('no action on: ' + name);
			continue;
		}
		
		downloadAndExtract(url, pkgPath, name);
		registerWork(async () => {
			await writeInstallOk(ifOk);
			await writeBundleVersion(bvFile, bundleVersion, name, version);
		});
	}
}

async function isInstallOk(ifOk: string) {
	if (!await pathExists(ifOk)) {
		return false;
	}
	const content = (await readFile(ifOk, 'utf8')).trim();
	if (content === CONTENT_PACKAGE_OK) {
		return true;
	}
	return false;
}

function writeInstallOk(ifOk: string) {
	return writeFile(ifOk, CONTENT_PACKAGE_OK, 'utf8');
}

function writeBundleVersion(bvFile: string, bundleVersion: VersionMap, name: any, version: any) {
	bundleVersion[name] = version;
	return writeJson(bvFile, bundleVersion);
}
