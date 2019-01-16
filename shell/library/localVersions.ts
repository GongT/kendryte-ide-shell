import { lstat, pathExistsSync, readdir } from 'fs-extra';
import { compare } from 'semver';
import { loadApplicationData } from '../main/appdata';
import { applicationPath, nativePath, resourceLocation } from './environment';
import { logger } from './logger';

export interface ILocalStatus {
	version: string;
	patch: string;
	folder: string;
	fsPath: string;
}

function ensureString(patchVersion: any) {
	return typeof patchVersion === 'number'? patchVersion.toFixed(6) : patchVersion;
}

function isDir(file: string) {
	return lstat(file).then((stat) => {
		return stat.isDirectory();
	}, () => {
		return false;
	});
}

// return list of versions, oldest first, newest last
export async function readLocalVersions() {
	const root = applicationPath('.');
	if (!pathExistsSync(root)) {
		return [];
	}
	
	const {channel} = await loadApplicationData();
	
	const items = await readdir(root);
	const results: ILocalStatus[] = [];
	for (const item of items) {
		try {
			const versionRoot = nativePath(root, item);
			if (!await isDir(versionRoot)) {
				logger.debug('ignore not directory: ' + versionRoot);
				continue;
			}
			
			const {version, patchVersion} = require(nativePath(versionRoot, resourceLocation, 'package.json'));
			const extraVersion = version.split('-', 2)[1];
			
			if (extraVersion !== channel) {
				logger.debug('ignore other channel version: ' + version);
				continue;
			}
			
			results.push({
				version: version,
				patch: ensureString(patchVersion),
				folder: item,
				fsPath: versionRoot,
			});
			
			logger.log(`found local version: ${item}`);
			logger.log(`    version=${version}\n    patch=${ensureString(patchVersion)}`);
		} catch (e) {
			logger.error(e.stack);
			logger.error(`something wrong in version: ${item}`);
		}
	}
	
	results.sort((a, b) => {
		const bigVer = compare(a.version, b.version);
		if (bigVer === 0) {
			return parseFloat(a.patch) - parseFloat(b.patch);
		} else {
			return bigVer;
		}
	});
	
	logger.debug(
		'local versions: <ul>'
		+ results.map((item) => {
			return `<li>${item.version} @ ${item.patch}</li>`;
		}).join('\n')
		+ '</ul><div>&nbsp;</div>',
	);
	
	return results;
}
