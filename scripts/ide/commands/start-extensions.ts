import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { closeStream, usePretty } from '../../library/misc/usePretty';
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
	
	const output = usePretty('start-ext');
	await prepareLinkForDev(output);
	output.success('extension link created.');
	await closeStream(output);
	
	await buildExtension(process.stderr, getExtensionPath(false), process.argv.includes('-w'));
});
