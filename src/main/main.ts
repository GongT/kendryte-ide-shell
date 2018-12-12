import { logger } from '../library/logger';
import { loadJson } from '../library/network';
import { IRegistryData, ISelfConfig } from './appdata';
import { latestPatch } from './release.json';

export async function startMainLogic(data: ISelfConfig) {
	console.info('startMainLogic');
	logger.action('connecting');
	const registry = await loadJson<IRegistryData>(data.registry);
	logger.debug(JSON.stringify(data, null, 2));
	logger.action('checking');
	logger.debug('latest version: ' + registry.version);
	const lp = latestPatch(registry);
	logger.debug('latest patch: ' + (lp ? lp.version : 'no patch'));

}