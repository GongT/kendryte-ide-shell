import { VSCODE_ROOT } from '../../environment';
import { pipeCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { cleanScreen, getCleanableStdout } from '../../library/misc/clsUtil';
import { isExists } from '../../library/misc/fsUtil';
import { useThisStream } from '../../library/misc/globalOutput';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { TypescriptCompileOutputStream } from '../../library/misc/streamUtil';
import { buildExtension } from '../bundledExtensions/buildExtension';
import { getExtensionPath } from '../bundledExtensions/path';
import { prepareLinkForDev } from '../bundledExtensions/prepare';
import { getElectronIfNot } from '../codeblocks/getElectron';
import { gulpCommands } from '../codeblocks/gulp';
import { switchQuitKey } from '../codeblocks/switchQuitKey';

whatIsThis(
	'Compile source code',
	'编译源码',
);

runMain(async () => {
	process.env.FORCE_COLOR = 'yes'; // ensure typescript output has colors
	await getElectronIfNot();
	
	switchQuitKey();
	
	let skipped = false;
	if (process.argv.includes('--slow')
	    || !await isExists('extensions/css-language-features/client/out')
	    || !await isExists('data/extensions/kendryte-debug/gdb.js')
	) {
		await prepareLinkForDev();
		await buildExtension(getExtensionPath(false), false);
		
		chdir(VSCODE_ROOT);
		log('starting compile extensions...');
		await pipeCommandOut(process.stderr, 'node', ...gulpCommands(), 'compile-extensions');
		log('extensions compiled');
		useThisStream(process.stderr);
	} else {
		skipped = true;
	}
	
	let streamToDisplay = process.stdout;
	if (process.stdout.isTTY) {
		streamToDisplay = new TypescriptCompileOutputStream();
		streamToDisplay.pipe(getCleanableStdout());
		cleanScreen();
	}
	
	if (skipped) {
		console.error('\x1B[38;5;14mExtensions Recompile Skipped, add \'--slow\' to force do it!\x1B[0m');
	}
	
	console.error('starting: gulp watch-client');
	await pipeCommandOut(streamToDisplay, 'node', ...gulpCommands(), 'watch-client');
});
