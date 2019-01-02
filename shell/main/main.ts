import { ensureDir } from 'fs-extra';
import { appExt, applicationPath, isBuilt, SELF_VERSION } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { doActualWork, getWorkCount } from '../library/work';
import { IRegistryData, loadApplicationData } from './appdata';
import { downloadMain, migrateUserData, uninstallOldVersion } from './downloadMain';
import { downloadPatch } from './downloadPatch';
import { isRunSource, launchProduction, launchSource } from './launch';
import { getFullRegistry, IDEPatchJson, platform } from './release.json';
import { upgradeLocalPackages } from './upgradeLocalPackages';

function findRelease(registry: IRegistryData) {
	const res = registry[platform];
	
	if (!res) {
		if (!isBuilt) {
			debugger;
		}
		throw new Error('Registry is invalid.');
	}
	
	return res.downloadUrl;
}

function getString(patchVersion: any) {
	if (typeof patchVersion === 'string') {
		return patchVersion;
	} else if (typeof patchVersion === 'number') {
		return patchVersion.toFixed(6);
	} else {
		throw new Error('patchVersion is not valid');
	}
}

export async function startMainLogic() {
	const data = await loadApplicationData();
	console.info('startMainLogic');
	logger.progress(Infinity);
	logger.action('connecting');
	
	const registry = await getFullRegistry();
	const platformInfo = registry[platform];
	logger.debug('latest version: ' + platformInfo.version);
	const lastPatch = getString(platformInfo.patchVersion);
	logger.debug(`latest patch: ${lastPatch || 'No Patch'}`);
	
	logger.progress(NaN);
	
	logger.debug(`latest updater: ${registry.updaterVersion || 'No Updater'}`);
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
			logger.log(`framework version has updated, from ${newestLocal.version} to ${platformInfo.version}`);
			// big version has update
			if (newestLocal && newestLocal.version) {
				migrateUserData(newestLocal.version);
			}
			await ensureDir(applicationPath('.'));
			downloadMain(
				applicationPath(`app_${platformInfo.version}_${lastPatch}${appExt}`),
				findRelease(registry),
			);
		} else if (lastPatch && lastPatch !== newestLocal.patch) {
			logger.log(`patch version has updated, from ${newestLocal.patch} to ${lastPatch}`);
			// big version not update, bug have new patch
			downloadPatch(
				newestLocal.fsPath,
				applicationPath(`app_${platformInfo.version}_${lastPatch}${appExt}`),
				patchesToDownload(platformInfo.patches, newestLocal.patch),
			);
		}else{
			logger.log(`version and patch both same, just start .`);
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

function patchesToDownload(patches: IDEPatchJson[], localVer: string): string[] {
	return patches.filter((patch) => {
		return parseFloat(patch.version) > parseFloat(localVer);
	}).map((item) => {
		return item.download;
	});
}
