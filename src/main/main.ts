import { ensureDir, pathExistsSync, readdir } from 'fs-extra';
import { compare } from 'semver';
import { applicationPath, nativePath } from '../library/environment';
import { logger } from '../library/logger';
import { loadJson } from '../library/network';
import { willRemove } from '../library/removeDirectory';
import { doActualWork, getWorkCount, workTitle } from '../library/work';
import { IRegistryData, ISelfConfig } from './appdata';
import { downloadMain } from './downloadMain';
import { downloadPatch } from './downloadPatch';
import { IDEPatchJson, latestPatch, SYS_NAME } from './release.json';
import { upgradeLocalPackages } from './upgradeLocalPackages';

function findRelease(registry: IRegistryData) {
	const selections = registry.allDownloads[SYS_NAME];
	const res = selections.find((item) => {
		return item.endsWith('.7z') || item.endsWith('.7z.bin');
	});
	
	if (!res) {
		debugger;
		throw new Error('Registry is invalid.');
	}
	
	return res;
}

export async function startMainLogic(data: ISelfConfig) {
	console.info('startMainLogic');
	logger.progress(Infinity);
	logger.action('connecting');
	
	logger.debug('Get registry:' + data.registry);
	const registry = await loadJson<IRegistryData>(data.registry);
	logger.debug('latest version: ' + registry.version);
	const lp = latestPatch(registry);
	const lastPatch = lp? str(lp.version) : '';
	logger.debug(`latest patch: ${lastPatch || 'No Patch'}`);
	
	logger.progress(NaN);
	logger.action('checking');
	logger.debug('-------------------------');
	
	await upgradeLocalPackages(data.thirdParty);
	
	const localVersions = await readLocalVersions();
	while (localVersions.length > 3) {
		const item = localVersions.shift();
		workTitle('Uninstalling', 'too old version: ' + item.version);
		willRemove(item.fsPath);
	}
	
	const newestLocal = localVersions[localVersions.length - 1];
	if (!newestLocal || newestLocal.version !== registry.version) {
		// big version has update
		await ensureDir(applicationPath('.'));
		await downloadMain(
			applicationPath(`app_${registry.version}_${lastPatch}`),
			findRelease(registry),
		);
	} else if (lastPatch && lastPatch !== newestLocal.patch) {
		// big version not update, bug have new patch
		await downloadPatch(
			newestLocal.fsPath,
			applicationPath(`app_${registry.version}_${lastPatch}`),
			patchesToDownload(registry.patches, newestLocal.patch),
		);
	}
	logger.debug(`check complete. ${getWorkCount()} work to be done.`);
	logger.debug('-------------------------');
	
	if (getWorkCount() !== 0) {
		logger.action('...');
		await doActualWork();
	}
	
	logger.action('application is starting');
}

function str(v: any) {
	return typeof v === 'number'? v.toFixed(6) : v;
}

export interface ILocalStatus {
	version: string;
	patch: string;
	folder: string;
	fsPath: string;
}

async function readLocalVersions() {
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

function patchesToDownload(patches: IDEPatchJson[], localVer: string): string[] {
	return patches.filter((patch) => {
		return parseFloat(patch.version) > parseFloat(localVer);
	}).map((item) => {
		return item[SYS_NAME].generic;
	});
}
