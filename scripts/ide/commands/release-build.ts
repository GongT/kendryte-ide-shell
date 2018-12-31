import { copy } from 'fs-extra';
import { resolve } from 'path';
import { ARCH_RELEASE_ROOT, isCI, isMac, isWin, RELEASE_ROOT, VSCODE_ROOT, WORKSPACE_ROOT } from '../../environment';
import { shellExecAsync } from '../../library/childprocess/simple';
import { log } from '../../library/gulp';
import { cleanScreen } from '../../library/misc/clsUtil';
import { calcCompileFolderName, getPackageData, getProductData, rename } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir, ensureChdir, nativePath } from '../../library/misc/pathUtil';
import { timing } from '../../library/misc/timeUtil';
import { EXTENSIONS_DIST_PATH_RESULT, listExtension } from '../../task.extensions/path';
import { linuxBuild } from '../codeblocks/build/build-linux';
import { macBuild } from '../codeblocks/build/build-mac';
import { windowsBuild } from '../codeblocks/build/build-windows';
import { extractSourceCodeIfNeed } from '../codeblocks/build/buildExtractSource';
import {
	cleanupBuildResult,
	deleteCompileCaches,
	downloadBuiltinExtensions,
	downloadElectron,
	yarnInstall,
} from '../codeblocks/build/common-step';
import { creatingReleaseZip } from '../codeblocks/zip';

whatIsThis(
	'Run the full release process, create 7z archive(s), no upload',
	'执行完整的发布流程，创建7z压缩包，不上传',
);

runMain(async () => {
	cleanScreen();
	chdir(VSCODE_ROOT);
	
	log('Starting build...');
	
	process.env.BUILDING = 'yes';
	await deleteCompileCaches();
	
	const product = await getProductData();
	await getPackageData();
	
	const zipStoreDir = resolve(RELEASE_ROOT, 'release-files');
	
	log(`Starting build
	Release Root=${RELEASE_ROOT}
	Product Name=${product.applicationName}
	App Title=${product.nameShort}
	Platform=${isWin? 'windows' : isMac? 'mac os' : 'linux'}
	Storage=${zipStoreDir}

`);
	
	ensureChdir(RELEASE_ROOT);
	const wantDirName = await calcCompileFolderName();
	const wantDirPath = resolve(RELEASE_ROOT, wantDirName);
	if (!isCI) {
		await cleanupBuildResult(wantDirPath);
	}
	
	if (!isCI) {
		await extractSourceCodeIfNeed();
		await yarnInstall();
	}
	
	await downloadElectron();
	await downloadBuiltinExtensions();
	
	log('Build bundle extensions');
	await buildExtension();
	log('Bundle extensions built');
	
	const timeBuild = timing();
	log('\x1B[38;5;10mPrepare complete.\x1B[0m Start building package. This is really slow.');
	
	let compileResultFolder: string;
	chdir(ARCH_RELEASE_ROOT);
	if (isWin) {
		compileResultFolder = await windowsBuild();
	} else if (isMac) {
		compileResultFolder = await macBuild();
	} else {
		compileResultFolder = await linuxBuild();
	}
	log('Build process complete.' + timeBuild());
	
	await rename(compileResultFolder, wantDirPath);
	
	log('Copy bundle extensions');
	await copyExtension(wantDirPath);
	
	chdir(RELEASE_ROOT);
	
	const timeZip = timing();
	log('Creating zip packages...');
	await creatingReleaseZip();
	log('Zip files created.' + timeZip());
	
	log('Done.');
});

async function buildExtension() {
	chdir(WORKSPACE_ROOT);
	await shellExecAsync('yarn', 'script', 'extensions:build');
}

async function copyExtension(wantDirPath: string) {
	for (const name of listExtension()) {
		const dist = nativePath(EXTENSIONS_DIST_PATH_RESULT, name);
		await copy(dist, nativePath(wantDirPath, 'resources/app/extensions'));
	}
}
