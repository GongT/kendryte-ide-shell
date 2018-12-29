import { log } from '../../library/gulp';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { timing } from '../../library/misc/timeUtil';
import { creatingReleaseZip } from '../codeblocks/zip';

whatIsThis(
	'(re-)Create 7z files from last compiled result',
	'从上次编译的结果（重新）创建7z压缩包',
);

runMain(async () => {
	const timeZip = timing();
	log('Creating zip packages...');
	await creatingReleaseZip();
	log('Zip files created.' + timeZip());
});
