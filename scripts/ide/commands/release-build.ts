import { OutputStreamControl } from '@gongt/stillalive';
import { resolve } from 'path';
import { ARCH_RELEASE_ROOT, isMac, isWin, RELEASE_ROOT, VSCODE_ROOT } from '../../environment';
import { cleanScreen } from '../../library/misc/clsUtil';
import { calcCompileFolderName, getPackageData, getProductData, rename } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { timing } from '../../library/misc/timeUtil';
import { usePretty } from '../../library/misc/usePretty';
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

let output: OutputStreamControl;
runMain(async () => {
	cleanScreen();
	chdir(VSCODE_ROOT);
	
	output = usePretty('build');
	output.write('starting build...\n');
	
	process.env.BUILDING = 'yes';
	await deleteCompileCaches(output);
	
	const product = await getProductData();
	await getPackageData();
	
	const zipStoreDir = resolve(RELEASE_ROOT, 'release-files');
	
	output.write(`Starting build
	Release Root=${RELEASE_ROOT}
	Product Name=${product.applicationName}
	App Title=${product.nameShort}
	Platform=${isWin? 'windows' : isMac? 'mac os' : 'linux'}
	Storage=${zipStoreDir}

`);
	
	chdir(RELEASE_ROOT);
	const wantDirName = await calcCompileFolderName();
	const wantDirPath = resolve(RELEASE_ROOT, wantDirName);
	await cleanupBuildResult(output, wantDirPath);
	
	await extractSourceCodeIfNeed(output);
	
	await yarnInstall(output);
	await downloadElectron(output);
	await downloadBuiltinExtensions(output);
	
	const timeBuild = timing();
	output.success('\x1B[38;5;10mPrepare complete.\x1B[0m Start building package. This is really slow.');
	
	let compileResultFolder: string;
	chdir(ARCH_RELEASE_ROOT);
	if (isWin) {
		compileResultFolder = await windowsBuild(output);
	} else if (isMac) {
		compileResultFolder = await macBuild(output);
	} else {
		compileResultFolder = await linuxBuild(output);
	}
	output.success('Build process complete.' + timeBuild());
	
	await rename(compileResultFolder, wantDirPath);
	
	await installExtensionDevelopDeps(output, getExtensionPath(true));
	output.success('Bundle extensions dependencies resolved');
	await prepareLinkForProd(output, getExtensionPath(true, wantDirPath));
	output.success('Bundle extensions link created.');
	await installExtensionProdDeps(output, getExtensionPath(true, wantDirPath));
	output.success('Bundle extensions production dependencies resolved');
	await buildExtension(output, getExtensionPath(true, wantDirPath), false);
	output.success('Bundle extensions built');
	
	const timeZip = timing();
	output.log('Creating zip packages...');
	await creatingReleaseZip(output);
	output.success('Zip files created.' + timeZip());
	
	output.success('Done.');
});
