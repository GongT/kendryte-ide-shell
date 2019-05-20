import { spawnSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { readJsonSync } from 'fs-extra';
import { resolve } from 'path';
import { isWin, ORIGINAL_PATH, PATH, PATH_SP, VSCODE_ROOT } from '../../environment';
import { cleanScreen } from '../../library/misc/clsUtil';
import { whatIsThis } from '../../library/misc/help';
import { preventProxy, runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { builtInExtensions } from '../codeblocks/builtInExtensions';
import { getElectronIfNot } from '../codeblocks/getElectron';

whatIsThis(
	'Run KendryteIDE',
	'运行 KendryteIDE',
);

runMain(async () => {
	const passArgs = process.argv.slice(2);
	
	cleanScreen();
	preventProxy();
	
	const env = {...process.env};
	for (const i of Object.keys(env)) {
		if (i.startsWith('npm_')) {
			delete env[i];
		}
	}
	env.PATH = PATH + PATH_SP + ORIGINAL_PATH;
	
	await getElectronIfNot();
	await builtInExtensions();
	
	delete process.env.VSCODE_PORTABLE;
	
	chdir(VSCODE_ROOT);
	
	delete process.env.HTTP_PROXY;
	delete process.env.HTTPS_PROXY;
	delete process.env.ALL_PROXY;
	
	if (passArgs.includes('--builtin')) {
		return run(['build/builtin'], env);
	}
	
	const inspect = passArgs.find(e => /^--inspect(-brk)?(=|$)/.test(e));
	if (inspect) {
		const port = parseInt(inspect.replace(/^--inspect(-brk)?(=|$)/, '')) || 9229;
		passArgs.push(`--inspect${inspect[1] || ''}-extensions=${port + 1}`);
	} else {
		passArgs.push(`--inspect=9229`);
		passArgs.push(`--inspect-extensions=9230`);
	}
	
	const markupFile = resolve(process.env.TEMP, 'debug-ide-restart.mark');
	do {
		if (existsSync(markupFile)) {
			unlinkSync(markupFile);
		}
		run(passArgs, env);
	} while (existsSync(markupFile));
});

function run(passArgs: string[], env: any) {
	console.log(passArgs);
	if (isWin) {
		const NAMESHORT = env.NAMESHORT = readJsonSync('product.json').nameShort + '.exe';
		const CODE = env.CODE = '.build//electron//' + NAMESHORT;
		
		env.NODE_ENV = 'development';
		env.VSCODE_DEV = 1;
		env.VSCODE_CLI = 1;
		env.ELECTRON_DEFAULT_ERROR_MODE = 1;
		env.ELECTRON_ENABLE_LOGGING = 1;
		env.ELECTRON_ENABLE_STACK_DUMPING = 1;
		
		console.error(CODE, '.', passArgs.join(' '));
		spawnSync(CODE, ['.', ...passArgs], {
			encoding: 'utf8',
			stdio: 'inherit',
			env,
		});
	} else {
		console.error('bash scripts/code.sh %s', passArgs.join(' '));
		spawnSync('bash', ['scripts/code.sh', ...passArgs], {
			encoding: 'utf8',
			stdio: 'inherit',
			env,
		});
	}
}