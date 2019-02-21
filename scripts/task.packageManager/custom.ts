import { pathExists } from 'fs-extra';
import { isForceRun } from '../environment';
import { buffer, downloadBuffer, gulp, gulpSrc, log, rename, VinylFile, zip } from '../library/gulp';
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

export function publishUserCustom() {
	if (!process.env.REPO) {
		console.error('environment "REPO" is required');
		throw new Error('Arguments wrong');
	}
	const target = process.env.REPO.replace(/\.git$/, '');
	const branch = process.env.BRANCH || 'master';
	
	return publishZip(target, downloadBuffer(`https://github.com/${target}/archive/${branch}.zip`));
}

export async function publishLocal() {
	if (!process.env.REPO) {
		console.error('environment "REPO" is required');
		throw new Error('Arguments wrong');
	}
	const targetArg = process.env.REPO.replace(/\.git$/, '');
	
	if (!process.env.ZIP) {
		console.error('environment "ZIP" is required');
		throw new Error('Arguments wrong');
	}
	const fileArg = process.env.ZIP;
	if (!fileArg.endsWith('.zip')) {
		console.error('last argument must end with .zip');
		throw new Error('Arguments wrong');
	}
	
	await streamPromise(
		zip.src(fileArg)
		   .pipe(buffer())
		   .pipe(simpleTransformStream((file: VinylFile) => {
			   if (file.basename === 'kendryte-package.json') {
				   const data = JSON.parse(file.contents.toString());
				   const wantName = targetArg.replace('/', '_');
				   if (data.name !== wantName) {
					   throw new Error(`name of project is ${data.name} but not ${wantName}`);
				   }
			   }
			   return file;
		   })),
	);
	
	await publishZip(targetArg, gulp.src(fileArg));
}

async function publishZip(target: string, zipStream: NodeJS.ReadableStream) {
	const name = target.toLowerCase().replace('/', '_');
	
	const tempDir = nativePath(PM_TEMP_DIR, name);
	
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
	const pkgName = pkgData.name;
	const version = pkgData.version;
	const type: PackageTypes = pkgData.type;
	
	log('package.name=%s', pkgName);
	log('package.version=%s', version);
	log('package.type=%s', type);
	
	if (!pkgName || !version || !type) {
		throw new Error('[name, version, type] is not exists in kendryte-package.json');
	}
	if (pkgName !== name) {
		throw new Error('the package must name with ' + name);
	}
	
	let registry: IRemotePackageRegistry;
	if (type === PackageTypes.Library) {
		registry = await ExS3.instance().loadJson<IRemotePackageRegistry>(OBJKEY_PACKAGE_MANAGER_LIBRARY);
	} else if (type === PackageTypes.Executable) {
		registry = await ExS3.instance().loadJson<IRemotePackageRegistry>(OBJKEY_PACKAGE_MANAGER_EXAMPLE);
	} else {
		throw new Error('package type is invalid');
	}
	const packageRegistry = findOrPrependPackage(type, name, registry, false);
	const versionRegistry = findOrAppendVersion(version, packageRegistry.versions);
	if (versionRegistry.downloadUrl && !isForceRun) {
		throw new Error('cannot publish over same version (' + version + ').');
	}
	
	const uploadStream = gulpSrc(tempDir, '**')
		.pipe(normalizeVinyl())
		.pipe(skipDirectories())
		.pipe(zip.zip(`${target}-${version}.zip`))
		.pipe(buffer())
		.pipe(gulpS3.dest({base: OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH}));
	
	versionRegistry.downloadUrl =
		ExS3.instance().websiteUrl(posixJoin(OBJKEY_PACKAGE_MANAGER_USER_PACKAGE_PATH, `${target}-${version}.zip`));
	
	await streamPromise(uploadStream);
	
	log('put registry json back.');
	if (type === PackageTypes.Library) {
		await ExS3.instance().putJson(OBJKEY_PACKAGE_MANAGER_LIBRARY, registry);
	} else if (type === PackageTypes.Executable) {
		await ExS3.instance().putJson(OBJKEY_PACKAGE_MANAGER_EXAMPLE, registry);
	} else {
		throw new Error('package type is invalid');
	}
}