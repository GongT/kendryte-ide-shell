import { ensureDir } from 'fs-extra';
import { applicationPath, isBuilt, SELF_VERSION } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { doActualWork, getWorkCount } from '../library/work';
import { IRegistryData, loadApplicationData } from './appdata';
import { downloadMain, migrateUserData, uninstallOldVersion } from './downloadMain';
import { downloadPatch } from './downloadPatch';
import { isRunSource, launchProduction, launchSource } from './launch';
import { getFullRegistry, IDEPatchJson, latestPatch, platform } from './release.json';
import { upgradeLocalPackages } from './upgradeLocalPackages';

function findRelease(registry: IRegistryData) {
	const res = registry[platform];
	
	if (!res) {
		debugger;
		throw new Error('Registry is invalid.');
	}
	
	return res.downloadUrl;
}

export async function startMainLogic() {
	const data = await loadApplicationData();
	console.info('startMainLogic');
	logger.progress(Infinity);
	logger.action('connecting');
	
	const registry = await getFullRegistry();
	const platformInfo = registry[platform];
	logger.debug('latest version: ' + platformInfo.version);
	const lp = latestPatch(platformInfo);
	const lastPatch = lp? str(lp.version) : '';
	logger.debug(`latest patch: ${lastPatch || 'No Patch'}`);
	
	logger.progress(NaN);
	
	if (isBuilt && registry.updaterVersion + '' !== SELF_VERSION) {
		logger.log('remote: ' + registry.updaterVersion);
		logger.log('local: ' + SELF_VERSION);
		logger.action('Outdated !', 'please download newest version.');
		logger.sub2('Please click the Download button below 👇');
		return;
	}
	
	logger.action('checking');
	logger.debug('-------------------------');
	
	await upgradeLocalPackages(data.thirdParty);
	
	const localVersions = await readLocalVersions();
	if (localVersions.length > 3) {
		uninstallOldVersion(localVersions);
	}
	
	if (await isRunSource(data)) {
		launchSource(data);
	} else {
		const newestLocal = localVersions.pop();
		if (!newestLocal || newestLocal.version !== platformInfo.version) {
			// big version has update
			if (newestLocal && newestLocal.version) {
				migrateUserData(newestLocal.version);
			}
			await ensureDir(applicationPath('.'));
			downloadMain(
				applicationPath(`app_${platformInfo.version}_${lastPatch}`),
				findRelease(registry),
			);
		} else if (lastPatch && lastPatch !== newestLocal.patch) {
			// big version not update, bug have new patch
			downloadPatch(
				newestLocal.fsPath,
				applicationPath(`app_${platformInfo.version}_${lastPatch}`),
				patchesToDownload(platformInfo.patches, newestLocal.patch),
			);
		}
		launchProduction();
	}
	logger.debug(`check complete. ${getWorkCount()} work to be done.`);
	logger.debug('-------------------------');
	
	if (getWorkCount() !== 0) {
		logger.action('...');
		await doActualWork();
	}
	logger.debug('All jobs complete. window will close now!');
	
	logger.progress(NaN);
	logger.sub1('');
	logger.sub2('');
	
	window.close();
}

function str(v: any) {
	return typeof v === 'number'? v.toFixed(6) : v;
}

function patchesToDownload(patches: IDEPatchJson[], localVer: string): string[] {
	return patches.filter((patch) => {
		return parseFloat(patch.version) > parseFloat(localVer);
	}).map((item) => {
		return item.download;
	});
}
