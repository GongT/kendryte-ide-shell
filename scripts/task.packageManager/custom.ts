import { pathExists } from 'fs-extra';
import { isForceRun } from '../environment';
import { buffer, downloadBuffer, gulp, gulpSrc, log, rename, zip } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { normalizeVinyl } from '../library/gulp/normalizeVinyl';
import { removeFirstComponent } from '../library/gulp/pathTools';
import { skipDirectories } from '../library/gulp/skipDirectories';
import { simpleTransformStream } from '../library/gulp/transform';
import { IRemotePackageRegistry, PackageTypes } from '../library/jsonDefine/packageRegistry';
import { ExS3 } from '../library/misc/awsUtil';
import { readFile } from '../library/misc/fsUtil';
import { nativePath, posixJoin } from '../library/misc/pathUtil';
import { streamPromise } from '../library/misc/streamUtil';
import {
	OBJKEY_PACKAGE_MANAGER_EXAMPLE,
	OBJKEY_PACKAGE_MANAGER_LIBRARY,
	OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH,
} from '../library/releaseInfo/s3Keys';
import { PM_TEMP_DIR } from './clean';
import { findOrAppendVersion, findOrPrependPackage } from './registry';
import { isOverrideableVersion } from './version';

export async function publishUserCustom() {
	if (!process.env.REPO) {
		console.error('environment "REPO" is required');
		throw new Error('Arguments wrong');
	}
	const target = process.env.REPO.replace(/\.git$/, '');
	const branch = process.env.BRANCH || 'master';

	await packageManagerPublishZip(target, downloadBuffer(`https://github.com/${target}/archive/${branch}.zip`));

	await packageManagerFlushJson();
}

export async function publishLocal() {
	if (!process.env.REPO) {
		log.error('environment "REPO" is required');
		throw new Error('Arguments wrong');
	}
	const targetArg = process.env.REPO.replace(/\.git$/, '');

	if (!process.env.ZIP) {
		log.error('environment "ZIP" is required');
		throw new Error('Arguments wrong');
	}
	const fileArg = process.env.ZIP;
	if (!fileArg.endsWith('.zip')) {
		log.error('last argument must end with .zip');
		throw new Error('Arguments wrong');
	}
	log.info('REPO=%s, ZIP=%s', targetArg, fileArg);

	await packageManagerPublishZip(targetArg, gulp.src(fileArg));

	await packageManagerFlushJson();
}

const registryCache: {[type: string]: IRemotePackageRegistry} = {};

export async function packageManagerFetchJson(type: PackageTypes): Promise<IRemotePackageRegistry> {
	if (type === PackageTypes.Library) {
		if (!registryCache[type]) {
			registryCache[type] = await ExS3.instance().loadJson<IRemotePackageRegistry>(OBJKEY_PACKAGE_MANAGER_LIBRARY);
		}
		return registryCache[type];
	} else if (type === PackageTypes.Executable) {
		if (!registryCache[type]) {
			registryCache[type] = await ExS3.instance().loadJson<IRemotePackageRegistry>(OBJKEY_PACKAGE_MANAGER_EXAMPLE);
		}
		return registryCache[type];
	} else {
		throw new Error('package type is invalid');
	}
}

export async function packageManagerFlushJson() {
	if (registryCache[PackageTypes.Library]) {
		log('put registry json (library) back.');
		await ExS3.instance().putJson(OBJKEY_PACKAGE_MANAGER_LIBRARY, registryCache[PackageTypes.Library]);
	}
	if (registryCache[PackageTypes.Executable]) {
		log('put registry json (example) back.');
		await ExS3.instance().putJson(OBJKEY_PACKAGE_MANAGER_EXAMPLE, registryCache[PackageTypes.Executable]);
	}
}

export async function packageManagerPublishZip(target: string, zipStream: NodeJS.ReadableStream) {
	const libName = target.toLowerCase().replace('/', '_');
	const tempDir = nativePath(PM_TEMP_DIR, libName);

	const extractStream = zipStream
		.pipe(zip.src())
		.pipe(normalizeVinyl())
		.pipe(skipDirectories())
		.pipe(rename(removeFirstComponent))
		.pipe(simpleTransformStream(f => {
			if (f.basename.startsWith('.') || f.relative.startsWith('.') || /[\\\/]\./.test(f.relative)) {
				return void 0;
			}
			if (f.relative === '.' && f.basename === 'CMakeLists.txt') {
				return void 0;
			}
			return f;
		}))
		.pipe(gulp.dest(tempDir));

	await streamPromise(extractStream);

	const packageFile = nativePath(tempDir, 'kendryte-package.json');
	if (!await pathExists(packageFile)) {
		throw new Error('kendryte-package.json does not exists');
	}
	let pkgData: any;
	eval('pkgData=' + await readFile(packageFile));
	const pkgName = ('' + pkgData.name).toLowerCase();
	const version = pkgData.version;
	const type: PackageTypes = pkgData.type;

	log('package.name=%s', pkgName);
	log('package.version=%s', version);
	log('package.type=%s', type);

	if (!pkgName || !version || !type) {
		throw new Error('[name, version, type] is not exists in kendryte-package.json');
	}
	if (pkgName !== target) {
		throw new Error(`the package must name with ${target}, but got ${pkgName}`);
	}

	const registry = await packageManagerFetchJson(type);
	const packageRegistry = findOrPrependPackage(type, target, registry, false);
	const versionRegistry = findOrAppendVersion(version, packageRegistry.versions);
	if (versionRegistry.downloadUrl && !isForceRun && !isOverrideableVersion(version)) {
		throw new Error('cannot publish over same version (' + version + ').');
	}

	const uploadStream = gulpSrc(tempDir, '**')
		.pipe(normalizeVinyl())
		.pipe(skipDirectories())
		.pipe(zip.zip(`${libName}-${version}.zip`))
		.pipe(buffer())
		.pipe(gulpS3.dest({base: OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH}));

	versionRegistry.downloadUrl =
		ExS3.instance().websiteUrl(posixJoin(OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH, `${libName}-${version}.zip`));

	await streamPromise(uploadStream);
}