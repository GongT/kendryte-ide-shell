import { isWin, VSCODE_ROOT } from '../../environment';
import { installDependency } from '../../library/childprocess/yarn';
import { installExtensionDevelopDeps } from '../bundledExtensions/installAll';
import { getExtensionPath } from '../bundledExtensions/path';
import { packWindows } from '../codeblocks/packWindows';
import { reset_asar } from '../codeblocks/resetAsar';
import { lstat } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { usePretty } from '../../library/misc/usePretty';

whatIsThis(
	'Install dependencies for developing and debugging',
	'安装开发、调试 KendryteIDE 所需的依赖',
);

runMain(async () => {
	chdir(VSCODE_ROOT);
	const output = usePretty('install-dependency');
	output.writeln('installing dependencies');
	if (isWin) {
		output.writeln('is windows, use asar method.');
		const stat = await lstat('./node_modules');
		if (stat && stat.isDirectory()) {
			throw new Error('node_modules exists, must remove.');
		}
		await reset_asar(output);
		output.success('cleanup complete.');
		await packWindows(output);
		output.success('ASAR package created.');
	} else {
		output.writeln('is not windows, use native method.');
		await installDependency(output, VSCODE_ROOT);
		output.success('node packages installed.');
	}
	
	await installExtensionDevelopDeps(output, getExtensionPath(false));
	output.success('extension dependencies installed.');
	
	output.success('Done.');
});
