import { jeditor, task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { IPackageVersionDetail, IRemotePackageInfo, IRemotePackageRegistry, PackageTypes } from '../library/jsonDefine/packageRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { posixJoin } from '../library/misc/pathUtil';
import { OBJKEY_PACKAGE_MANAGER_EXAMPLE } from '../library/releaseInfo/s3Keys';
import { exampleList, freertosExample, standaloneExample } from './examples';
import { createKeyBase, createKeyName } from './path';

export const updateExampleRegistry = task('pm:example.json', [standaloneExample, freertosExample], () => {
	return gulpS3.src(OBJKEY_PACKAGE_MANAGER_EXAMPLE)
	             .pipe(jeditor((json: IRemotePackageRegistry) => {
		             exampleList.forEach(({type, name, version}) => {
			             const reg = findOrPrependPackage(PackageTypes.Library, name + '_' + type, json, true);
			             const down = findOrAppendVersion(version, reg.versions);
			             down.downloadUrl = ExS3.instance().websiteUrl(
				             posixJoin(
					             createKeyBase(PackageTypes.Executable, name),
					             createKeyName(version, type),
				             ),
			             );
		             });
		             return json;
	             }))
	             .pipe(gulpS3.dest());
});

export function findOrAppendVersion(version: string, json: IPackageVersionDetail[]) {
	const exists = json.find(i => i.versionName === version);
	if (exists) {
		return exists;
	}
	const newData: IPackageVersionDetail = {
		versionName: version,
		downloadUrl: '',
		releaseDate: Date.now(),
	};
	json.push(newData);
	return newData;
}

export function findOrPrependPackage(type: PackageTypes, name: string, json: IRemotePackageRegistry, prepend: boolean) {
	const exists = json.find(i => i.name === name);
	if (exists) {
		return exists;
	}
	const newData: IRemotePackageInfo = {
		name,
		type,
		versions: [],
	};
	json.unshift(newData);
	return newData;
}
