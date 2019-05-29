import { pathExists, readdir } from 'fs-extra';
import { basename } from 'path';
import { WORKSPACE_ROOT } from '../environment';
import { gulp, log } from '../library/gulp';
import { resolvePath } from '../library/misc/pathUtil';
import { packageManagerFlushJson, packageManagerPublishZip } from './custom';

export async function packageManagerPublishMonorepo() {
	const pathToRepo = process.env.KENDRYTE_PACKAGE_MONOREPO || resolvePath(WORKSPACE_ROOT, '../monorepo-kendryte-driver-collection');
	const buildPath = resolvePath(pathToRepo, 'build');
	if (!await pathExists(buildPath)) {
		throw new Error('Required monorepo path "' + buildPath + '" did not exists. set KENDRYTE_PACKAGE_MONOREPO to use other location.');
	}

	for (const item of await readdir(buildPath)) {
		if (!item.endsWith('.zip')) {
			continue;
		}

		log.info(`Publishing file '%s'`, item);
		const nameShould = 'kendryte_' + basename(item, '.zip');

		await packageManagerPublishZip(nameShould, gulp.src(resolvePath(buildPath, item)));
	}

	await packageManagerFlushJson();
}