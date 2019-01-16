import { ipcRenderer, remote } from 'electron';
import { is } from 'electron-util';
import { ensureDir, pathExistsSync, readJson } from 'fs-extra';
import { myArgs, nativePath, resourceLocation, systemTempPath, userDataPath } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { removeDirectory } from '../library/removeDirectory';
import { registerWork, workTitle } from '../library/work';
import { ISelfConfig } from './appdata';
import { rememberThisVersion } from './error';

export async function resolveExecutable(fsPath: string) {
	const product = nativePath(fsPath, resourceLocation, 'product.json');
	const data: any = await readJson(product);
	console.log('production = ', data);
	
	let executablePath = '';
	
	if (is.windows) {
		executablePath = nativePath(fsPath, data.nameShort + '.exe');
	} else if (is.linux) {
		executablePath = nativePath(fsPath, data.applicationName);
	} else { // is mac
		executablePath = nativePath(fsPath, 'Contents/MacOS/Electron');
	}
	
	console.log('executable path = %s', executablePath);
	return executablePath;
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
		const exe = await ideSourceCmdline(data);
		
		rememberThisVersion(null);
		await launchIDE(exe, remote.process.cwd(), myArgs(), {
			IS_SOURCE_RUN: 'yes',
			VSCODE_PATH: data.sourceRoot,
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
	await removeDirectory(nativePath(userData, 'tmp'));
	
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

async function ideSourceCmdline(data: ISelfConfig) {
	logger.log('try to find IDE source code at: ' + data.sourceRoot);
	if (!await pathExistsSync(nativePath(data.sourceRoot, 'package.json'))) {
		throw new Error('Unable to detect IDE source code. Did you checked it out?');
	}
	if (is.windows) {
		return [
			'powershell.exe',
			nativePath(data.workspaceRoot, 'scripts/start.ps1'),
			'start-debug',
		];
	} else {
		return [
			'bash',
			nativePath(data.workspaceRoot, 'scripts/start.sh'),
			'start-debug',
		];
	}
}