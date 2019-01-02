import { ipcRenderer, remote } from 'electron';
import { is } from 'electron-util';
import { ensureDir, pathExistsSync, readJson } from 'fs-extra';
import { myArgs, nativePath, resourceLocation, systemTempPath, userDataPath } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { registerWork, workTitle } from '../library/work';
import { ISelfConfig } from './appdata';
import { rememberThisVersion } from './error';

export async function resolveExecutable(fsPath: string) {
	const product = nativePath(fsPath, resourceLocation, 'product.json');
	const data: any = await readJson(product);
	console.log('production = ', data);
	
	const executableName = is.windows? data.nameShort + '.exe' : data.applicationName;
	console.log('executable name = %s', executableName);
	return nativePath(fsPath, executableName);
}

export function launchProduction() {
	workTitle('starting', '...');
	registerWork('launch application', async () => {
		const lastVersion = (await readLocalVersions()).pop();
		if (!lastVersion) {
			throw new Error('latest IDE version not found');
		}
		logger.sub1(lastVersion.version + ' ' + lastVersion.patch);
		
		const exe = await resolveExecutable(lastVersion.fsPath);
		
		rememberThisVersion(lastVersion.fsPath);
		await launchIDE(exe, remote.process.cwd(), myArgs(), {
			VSCODE_PATH: lastVersion.fsPath,
		});
		
		// TODO: write out latest command line
		
	});
}

export function launchSource(data: ISelfConfig) {
	workTitle('starting', 'source code');
	registerWork('launch application source', async () => {
		const sourceRoot = ideSourceRoot(data);
		const exe = await ideSourceCmdline(sourceRoot);
		
		rememberThisVersion(null);
		await launchIDE(exe, remote.process.cwd(), myArgs(), {
			IS_SOURCE_RUN: 'yes',
			VSCODE_PATH: sourceRoot,
		});
	});
}

export async function launchIDE(exe: string|string[], cwd: string, args: string[], env: any) {
	console.info('LAUNCH', exe, cwd, args, env);
	await ensureDir(systemTempPath());
	const msg = `${exe} ${args.join(' ')}\nwd: ${cwd}`;
	logger.debug(msg);
	logger.sub2(msg);
	
	const userData = userDataPath('latest');
	await ensureDir(nativePath(userData, 'tmp'));
	
	await new Promise((resolve, reject) => {
		ipcRenderer.once('spawnCallback', (event: any, se: Error) => {
			console.log('spawnCallback', event, se);
			if (se) {
				const e = new Error(se.message);
				e.stack = se.stack;
				reject(e);
			} else {
				resolve();
			}
		});
		
		ipcRenderer.send('spawn', exe, args, cwd, env);
	});
}

export function isRunSource(data: ISelfConfig): boolean {
	return data.channel === 'sourcecode';
}

async function ideSourceCmdline(sourceRoot: string) {
	logger.debug('try to find IDE source code at: ' + sourceRoot);
	if (!await pathExistsSync(nativePath(sourceRoot, 'kendryte-ide/package.json'))) {
		throw new Error('Unable to detect IDE source code. Did you checked it out?');
	}
	return [
		nativePath(sourceRoot, 'scripts/start.' + (is.windows? 'ps1' : 'sh')),
		'start-debug',
	];
}

export function ideSourceRoot(data: ISelfConfig) {
	return data.sourceRoot;
}