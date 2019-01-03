import { readJson } from 'fs-extra';
import { configFile } from '../library/environment';
import { IDEJson } from './release.json';

export const configFileName = 'channel.json';

export interface ISelfConfig {
	title: string;
	channel: string;
	sourceRoot: string;
	registry: string;
	thirdParty: string;
	downloadPage: string;
}

export interface IRegistryData extends IDEJson {
	updaterVersion: string;
}

let config: ISelfConfig;

export async function loadApplicationData(): Promise<ISelfConfig> {
	if (!config) {
		console.info('loadApplicationData');
		config = await readJson(configFile, { encoding: 'utf8' }) as any;
		console.info(config);
	}

	return config;
}
