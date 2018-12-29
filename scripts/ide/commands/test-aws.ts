import { resolve } from 'path';
import { log } from '../../library/gulp';
import { ExS3 } from '../../library/misc/awsUtil';
import { mkdirpSync } from '../../library/misc/fsUtil';
import { globalInterruptLog } from '../../library/misc/globalOutput';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';

whatIsThis(
	'Try download file from S3, test your credentials',
	'尝试从S3下载文件，测试S3配置是否正确',
);

runMain(async () => {
	const awsdir = resolve(process.env.HOME, '.aws');
	mkdirpSync(awsdir);
	try {
		globalInterruptLog('HTTP_PROXY=%s', process.env.HTTP_PROXY);
		
		await ExS3.instance().putText('/test-permission.txt', 'complete');
		
		log('Done. Your config file all right.');
		return 0;
	} catch (e) {
		log('Failed to load aws config: ' + e.message);
		log('your config is not valid.');
		log('');
		log('Place credentials and config file at ' + resolve(process.env.HOME, '.aws'));
		log('                                  or ' + resolve(process.env.ORIGINAL_HOME, '.aws'));
		log('    see https://docs.aws.amazon.com/cli/latest/userguide/cli-config-files.html');
		return 2;
	}
});
