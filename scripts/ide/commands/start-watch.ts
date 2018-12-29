import { pipeCommandOut } from '../../library/childprocess/complex';
import { buildExtension } from '../bundledExtensions/buildExtension';
import { getExtensionPath } from '../bundledExtensions/path';
import { getElectronIfNot } from '../codeblocks/getElectron';
import { gulpCommands } from '../codeblocks/gulp';
import { switchQuitKey } from '../codeblocks/switchQuitKey';
import { cleanScreen, getCleanableStdout } from '../../library/misc/clsUtil';
import { isExists } from '../../library/misc/fsUtil';
import { useThisStream } from '../../library/misc/globalOutput';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { TypescriptCompileOutputStream } from '../../library/misc/streamUtil';
import { usePretty } from '../../library/misc/usePretty';

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
		const stream = usePretty('compile-extension');
		
		await buildExtension(stream, getExtensionPath(false), false);
		
		stream.write('starting compile extensions...');
		await pipeCommandOut(stream, 'node', ...gulpCommands(), 'compile-extensions');
		stream.success('extensions compiled');
		useThisStream(process.stderr);
		stream.end();
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
