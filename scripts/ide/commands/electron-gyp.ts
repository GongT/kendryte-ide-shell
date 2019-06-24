import { simpleCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { getElectronVersion } from '../codeblocks/getElectronVersion';

whatIsThis(
	'Run node-gyp in current directory',
	'在当前目录运行node-gyp',
);

function setEnv(k: string, v: any) {
	log('\tnpm_config_%s = %s', k, v);
	process.env['npm_config_' + k] = '' + v.toString();
}

runMain(async () => {
	const PWD = process.cwd();
	log('run node-gyp for electron in current directory: ' + PWD);
	setEnv('target', getElectronVersion());
	setEnv('arch', 'x64');
	setEnv('disturl', 'https://electronjs.org/headers');
	setEnv('runtime', 'electron');
	setEnv('build_from_source', 'true');
	setEnv('LANG', 'en_US.UTF-8');
    process.env.HOME += '/electron-gyp';

	await simpleCommandOut('node-gyp', ...process.argv.slice(2));
});
