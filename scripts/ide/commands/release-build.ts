import { resolve } from 'path';
import { ARCH_RELEASE_ROOT, isMac, isWin, RELEASE_ROOT, VSCODE_ROOT } from '../../environment';
import { log } from '../../library/gulp';
import { cleanScreen } from '../../library/misc/clsUtil';
import { calcCompileFolderName, getPackageData, getProductData, rename } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir, ensureChdir } from '../../library/misc/pathUtil';
import { timing } from '../../library/misc/timeUtil';
import { buildExtension } from '../bundledExtensions/buildExtension';
import { installExtensionDevelopDeps, installExtensionProdDeps } from '../bundledExtensions/installAll';
import { getExtensionPath } from '../bundledExtensions/path';
import { prepareLinkForProd } from '../bundledExtensions/prepare';
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
	await cleanupBuildResult(wantDirPath);
	
	await extractSourceCodeIfNeed();
	
	await yarnInstall();
	await downloadElectron();
	await downloadBuiltinExtensions();
	
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
	
	await installExtensionDevelopDeps(getExtensionPath(true));
	log('Bundle extensions dependencies resolved');
	await prepareLinkForProd(getExtensionPath(true, wantDirPath));
	log('Bundle extensions link created.');
	await installExtensionProdDeps(getExtensionPath(true, wantDirPath));
	log('Bundle extensions production dependencies resolved');
	await buildExtension(getExtensionPath(true, wantDirPath), false);
	log('Bundle extensions built');
	chdir(RELEASE_ROOT);
	
	const timeZip = timing();
	log('Creating zip packages...');
	await creatingReleaseZip();
	log('Zip files created.' + timeZip());
	
	log('Done.');
});
