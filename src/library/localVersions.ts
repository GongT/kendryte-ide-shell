import { pathExistsSync, readdir } from 'fs-extra';
import { compare } from 'semver';
import { applicationPath, nativePath } from './environment';
import { logger } from './logger';

export interface ILocalStatus {
	version: string;
	patch: string;
	folder: string;
	fsPath: string;
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
			const versionRoot = nativePath(root, item, 'resources/app');
			const {version, patchVersion} = require(nativePath(versionRoot, 'package.json'));
			results.push({
				version,
				patch: patchVersion.toFixed(6),
				folder: item,
				fsPath: versionRoot,
			});
		} catch (e) {
			console.error('something wrong in version %s', item);
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
