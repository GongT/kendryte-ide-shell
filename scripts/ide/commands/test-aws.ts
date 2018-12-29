import { resolve } from 'path';
import { ExS3 } from '../../library/misc/awsUtil';
import { mkdirpSync } from '../../library/misc/fsUtil';
import { globalInterruptLog } from '../../library/misc/globalOutput';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { usePretty } from '../../library/misc/usePretty';

whatIsThis(
	'Try download file from S3, test your credentials',
	'尝试从S3下载文件，测试S3配置是否正确',
);

runMain(async () => {
	const awsdir = resolve(process.env.HOME, '.aws');
	mkdirpSync(awsdir);
	const output = usePretty('try-aws');
	try {
		globalInterruptLog('HTTP_PROXY=%s', process.env.HTTP_PROXY);
		
		await ExS3.instance().putText('/test-permission.txt', 'complete');
		
		output.success('Done. Your config file all right.');
		return 0;
	} catch (e) {
		output.fail('Failed to load aws config: ' + e.message);
		output.fail('your config is not valid.');
		output.fail('');
		output.fail('Place credentials and config file at ' + resolve(process.env.HOME, '.aws'));
		output.fail('                                  or ' + resolve(process.env.ORIGINAL_HOME, '.aws'));
		output.fail('    see https://docs.aws.amazon.com/cli/latest/userguide/cli-config-files.html');
		output.empty().pause();
		return 2;
	}
});
