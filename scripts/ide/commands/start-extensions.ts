import { log } from '../../library/gulp';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { buildExtension } from '../bundledExtensions/buildExtension';
import { getExtensionPath } from '../bundledExtensions/path';
import { prepareLinkForDev } from '../bundledExtensions/prepare';
import { switchQuitKey } from '../codeblocks/switchQuitKey';

whatIsThis(
	'Compile private extensions',
	'编译私有插件',
);

runMain(async () => {
	process.env.FORCE_COLOR = 'yes'; // ensure typescript output has colors
	
	switchQuitKey();
	
	await prepareLinkForDev();
	log('extension link created.');
	
	await buildExtension(getExtensionPath(false), process.argv.includes('-w'));
});
