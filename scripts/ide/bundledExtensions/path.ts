import { resolve } from 'path';
import { DEBUG_APP_ROOT, WORKSPACE_ROOT } from '../../environment';

export interface IExtensionPath {
	targetRoot: string;
	sourceRoot: string;
}

export function getExtensionPath(fromBuild: true): Pick<IExtensionPath, 'sourceRoot'>;
export function getExtensionPath(fromBuild: true, targetRoot: string): IExtensionPath;
export function getExtensionPath(fromBuild: false): IExtensionPath;
export function getExtensionPath(fromBuild: boolean, targetRoot: string = process.env.TEMP): IExtensionPath {
	if (fromBuild) {
		targetRoot = resolve(targetRoot, 'resources/app/extensions');
	} else {
		targetRoot = resolve(DEBUG_APP_ROOT, 'UserData/latest/extensions');
	}
	const sourceRoot = resolve(WORKSPACE_ROOT, 'extensions.kendryte');
	
	return {targetRoot, sourceRoot};
}