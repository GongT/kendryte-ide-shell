import { readJson } from 'fs-extra';
import { configFile } from '../library/environment';
import { IDEJson } from './release.json';

export const configFileName = 'channel.json';

export interface ISelfConfig {
	title: string;
	channel: string;
	registry: string;
	thirdParty: string;
}

export interface IRegistryData extends IDEJson {
}

export function loadApplicationData(): Promise<ISelfConfig> {
	console.info('loadApplicationData');

	return readJson(configFile, { encoding: 'utf8' });
}
