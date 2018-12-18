import { ipcRenderer, remote } from 'electron';
import { is } from 'electron-util';
import { ensureDir, pathExistsSync, readJson } from 'fs-extra';
import { appRoot, myArgs, nativePath, userDataPath } from '../library/environment';
import { readLocalVersions } from '../library/localVersions';
import { logger } from '../library/logger';
import { registerWork, workTitle } from '../library/work';
import { ISelfConfig } from './appdata';

export async function resolveExecutable(fsPath: string) {
	const product = nativePath(fsPath, 'resources/app/product.json');
	const data: any = readJson(product);
	
	const executableName = is.windows? data.nameShort + '.exe' : data.applicationName;
	return nativePath(executableName, product);
}

export function launchProduction() {
	workTitle('starting', '...');
	registerWork(async () => {
		const lastVersion = (await readLocalVersions()).pop();
		if (!lastVersion) {
			throw new Error('latest IDE version not found');
		}
		logger.sub1(lastVersion.version + ' ' + lastVersion.patch);
		
		const exe = await resolveExecutable(lastVersion.fsPath);
		
		await launch(exe, remote.process.cwd(), myArgs(), {
			VSCODE_PATH: lastVersion.fsPath,
		});
	}, 'launch application');
}

export function launchSource(data: ISelfConfig) {
	workTitle('starting', 'source code');
	registerWork(async () => {
		const sourceRoot = ideSourceRoot(data);
		const exe = await ideSourceCmdline(sourceRoot);
		
		await launch(exe, remote.process.cwd(), myArgs(), {
			IS_SOURCE_RUN: 'yes',
			VSCODE_PATH: sourceRoot,
		});
	}, 'launch application');
}

async function launch(exe: string|string[], cwd: string, args: string[], env: any) {
	console.info('LAUNCH', exe, cwd, args, env);
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
	return !!ideSourceRoot(data);
}

async function ideSourceCmdline(sourceRoot: string) {
	if (!await pathExistsSync(sourceRoot)) {
		throw new Error('Unable to detect IDE source code.');
	}
	return [
		nativePath(sourceRoot, 'my-scripts/start.' + (is.windows? 'ps1' : 'sh')),
		'start-debug',
	];
}

export function ideSourceRoot(data: ISelfConfig) {
	if (process.env.APPLICATION_RUN_SOURCE) {
		return nativePath(appRoot, process.env.APPLICATION_RUN_SOURCE);
	} else if (data.channel === 'sourcecode') {
		return nativePath(appRoot, data.sourceRoot);
	}
	return null;
}