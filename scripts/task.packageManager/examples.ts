import { mkdir, move, pathExists, readdir } from 'fs-extra';
import { buffer, gulp, gulpSrc, rename, task, zip } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { createRequestDownPromise } from '../library/gulp/download';
import { normalizeVinyl } from '../library/gulp/normalizeVinyl';
import { removeFirstComponent } from '../library/gulp/pathTools';
import { skipDirectories } from '../library/gulp/skipDirectories';
import { simpleTransformStream } from '../library/gulp/transform';
import { PackageTypes } from '../library/jsonDefine/packageRegistry';
import { readFile, writeFile } from '../library/misc/fsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { streamPromise } from '../library/misc/streamUtil';
import { clearPmLocalTempTask, PM_TEMP_DIR } from './clean';
import { createKeyBase, createKeyName } from './path';
import { SdkBranch, SdkType } from './version';

const ignoredFiles = /^(shared|tflite_label_image|\.github)(\\|\/|$)/;
export const exampleList: {
	type: string;
	name: string;
	version: string;
}[] = [];

function createPackage(packageName: string, type: SdkType, branch: SdkBranch) {
	return `{
	// cmake config file
	"$schema": "vscode://schemas/CMakeLists",
	"name": "${packageName}_${type}",
	"version": "${branch}",
	"type": "${PackageTypes.Executable}",
	"entry": "src/main.c",
	"source": [
		"src/*.c",
		"src/*.cpp",
		"src/*.h",
		"src/*.hpp"
	],
	"dependency": {
		"kendryte-${type}-sdk": "${branch}"
	}
}
`;
}

async function working(type: SdkType, version: SdkBranch) {
	const url = `https://github.com/kendryte/kendryte-${type}-demo/archive/${version}.zip`;
	const zipFile = nativePath(PM_TEMP_DIR, `${type}-demo-${version}.zip`);
	await createRequestDownPromise(url, zipFile);
	const tempPath = nativePath(PM_TEMP_DIR, `${type}-demo-${version}`);
	await streamPromise(
		zip.src(zipFile)
		   .pipe(rename(removeFirstComponent))
		   .pipe(simpleTransformStream(f => {
			   if (f.isDirectory() || f.relative === f.basename || ignoredFiles.test(f.relative)) {
				   return void 0;
			   }
			   if (f.basename.endsWith('.cmake')) {
				   return void 0;
			   }
			   return f;
		   }))
		   .pipe(gulp.dest(tempPath)));
	
	for (const dirName of await readdir(tempPath)) {
		const dir = nativePath(tempPath, dirName);
		const src = nativePath(dir, 'src');
		let name: string = dirName;
		if (!await pathExists(src)) {
			const contents = await readdir(dir);
			await mkdir(src);
			for (const f of contents) {
				if (f.startsWith('README') || f.startsWith('LICENSE') || f === 'kendryte-package.json') {
					continue;
				}
				await move(nativePath(dir, f), nativePath(src, f));
			}
		}
		
		const pkgFile = nativePath(dir, 'kendryte-package.json');
		if (await pathExists(pkgFile)) {
			const jData = await readFile(pkgFile);
			let pkg: any;
			eval('pkg=' + jData);
			name = pkg.name;
			if (version !== pkg.version) {
				await writeFile(pkgFile, jData.replace(`"${pkg.version}"`, `"${version}"`));
			}
		} else {
			await writeFile(pkgFile, createPackage(dirName, type, version));
		}
		
		exampleList.push({name, version, type});
		const zipStream = gulpSrc(dir, '**')
			.pipe(normalizeVinyl())
			.pipe(skipDirectories())
			.pipe(zip.zip(createKeyName(version, type)))
			.pipe(buffer())
			.pipe(gulpS3.dest({
				base: createKeyBase(PackageTypes.Executable, name),
			}));
		
		await streamPromise(zipStream);
	}
}

export const standaloneExample = task('pm:standalone:example', [clearPmLocalTempTask], () => {
	return Promise.all([
		working(SdkType.standalone, SdkBranch.master),
		working(SdkType.standalone, SdkBranch.develop),
	]);
});

export const freertosExample = task('pm:freertos:example', [clearPmLocalTempTask], () => {
	return Promise.all([
		working(SdkType.freertos, SdkBranch.master),
		working(SdkType.freertos, SdkBranch.develop),
	]);
});
