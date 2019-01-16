import { pathExistsSync, readdir } from 'fs-extra';
import { compare } from 'semver';
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

export async function readLocalVersions() {
	const root = applicationPath('.');
	if (!pathExistsSync(root)) {
		return [];
	}
	const items = await readdir(root);
	const results: ILocalStatus[] = [];
	for (const item of items) {
		try {
			const versionRoot = nativePath(root, item);
			const {version, patchVersion} = require(nativePath(versionRoot, resourceLocation, 'package.json'));
			results.push({
				version,
				patch: ensureString(patchVersion),
				folder: item,
				fsPath: versionRoot,
			});
			
			logger.log(`found local version: ${item}`);
			logger.log(`    version=${version}\n    patch=${patchVersion.toFixed(6)}`);
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
