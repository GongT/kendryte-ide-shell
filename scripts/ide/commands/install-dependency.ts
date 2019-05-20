import { isWin, VSCODE_ROOT } from '../../environment';
import { installDependency } from '../../library/childprocess/yarn';
import { fixSerialPortPackageBuild } from '../../library/fixSerialPortPackageBuild';
import { log } from '../../library/gulp';
import { lstat } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { usePrettyIfTty } from '../../library/misc/usePretty';
import { packWindows } from '../codeblocks/packWindows';
import { reset_asar } from '../codeblocks/resetAsar';

whatIsThis(
	'Install dependencies for developing and debugging',
	'安装开发、调试 KendryteIDE 所需的依赖',
);

runMain(async () => {
	usePrettyIfTty();
	chdir(VSCODE_ROOT);
	log('installing dependencies');
	if (isWin) {
		log('is windows, use asar method.');
		const stat = await lstat('./node_modules');
		if (stat && stat.isDirectory()) {
			throw new Error('node_modules exists, must remove.');
		}
		await reset_asar();
		log('cleanup complete.');
		await packWindows();
		log('ASAR package created.');
	} else {
		log('is not windows, use native method.');
		await installDependency(VSCODE_ROOT);
		await fixSerialPortPackageBuild(VSCODE_ROOT);
		log('node packages installed.');
	}
	
	log('Done.');
});
