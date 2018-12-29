import { creatingReleaseZip } from '../codeblocks/zip';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { timing } from '../../library/misc/timeUtil';
import { usePretty } from '../../library/misc/usePretty';

whatIsThis(
	'(re-)Create 7z files from last compiled result',
	'从上次编译的结果（重新）创建7z压缩包',
);

runMain(async () => {
	const output = usePretty('zip');
	
	const timeZip = timing();
	output.log('Creating zip packages...');
	await creatingReleaseZip(output);
	output.success('Zip files created.' + timeZip());
	
	output.success('Done.');
});