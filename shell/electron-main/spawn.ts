import { spawn } from 'child_process';
import { BrowserWindow, dialog, MessageBoxOptions } from 'electron';
import { createWriteStream } from 'fs-extra';
import { tmpdir } from 'os';
import { format } from 'util';
import { alwaysPromise } from '../library/alwaysPromise';
import { createLogPack } from '../library/createLogPack';
import { DEVELOPER_PREVENT_START } from '../library/debug';
import { contentRoot, isBuilt, localPackagePath, myProfilePath, systemTempPath, userDataPath } from '../library/environment';
import { registerCleanupStream } from '../library/lifecycle';
import { streamPromise } from '../library/streamPromise';
import { DebugScript } from './debugScript';
import { closeIpcChannel, createIpcChannel, ensureIpcServer, ipcPipe } from './ipc';
import { afterWord, gracefulRestart, handleProcessReference, isQuitting, muteQuit } from './lifecycleMain';
import { executableResolved, getLastKnownApp } from './rememberWhatIsStart';

let connId = 0;

function detectInspectPortToUse() {
	const myInspectArg = process.argv.find((item) => {
		return item.startsWith('--inspect');
	});
	const argName = /^--inspect(-brk)?(=|$)/.exec(myInspectArg);
	if (!argName[2]) { // no =port
		return 9230;
	}
	
	const port = parseInt(myInspectArg.replace(argName[0], ''));
	if (port === 9229) {
		return 9222;
	} else {
		return 9229;
	}
}

function makeAppArg(exe: string, args: string[]): [string, string[]] {
	if (!exe) {
		const app = getLastKnownApp();
		if (Array.isArray(app)) {
			exe = app[0];
			args.unshift(...app.slice(1));
		} else {
			exe = app;
		}
	}
	return [exe, args];
}

function newSpawn(exe: string, args: string[], cwd: string, envVars: any, channel: string) {
	const inspectPortArg = args.indexOf('--inspect-brk=') || args.indexOf('--inspect=');
	if (inspectPortArg !== -1) {
		args[inspectPortArg] = args[inspectPortArg].split('=')[0] + '=' + detectInspectPortToUse();
	}
	const inspectArg = args.indexOf('--inspect-brk') || args.indexOf('--inspect');
	if (inspectArg !== -1) {
		args[inspectArg] += '=' + detectInspectPortToUse();
	}
	
	for (const [k, v] of Array.from(Object.entries(process.env))) {
		if (!(k in envVars)) {
			envVars[k] = v;
		}
	}
	
	envVars.VSCODE_PORTABLE = userDataPath('latest');
	envVars.KENDRYTE_IDE_UPDATER = process.argv0;
	envVars.KENDRYTE_IDE_UPDATER_IS_BUILT = isBuilt? 'yes' : '';
	envVars.KENDRYTE_IDE_UPDATER_CONTENT_ROOT = contentRoot;
	envVars.KENDRYTE_IDE_LOCAL_PACKAGE_DIR = localPackagePath('.');
	envVars.KENDRYTE_IDE_UPDATER_PIPE = ipcPipe;
	envVars.KENDRYTE_IDE_UPDATER_PIPE_ID = channel;
	
	envVars.VSCODE_NLS_CONFIG = JSON.stringify({
		'locale': 'zh-cn',
		'availableLanguages': {},
		'_languagePackSupport': true,
	});
	
	envVars.SYSTEM_TEMP = tmpdir();
	envVars.TEMP = envVars.TMP = systemTempPath();
	
	const dbg = new DebugScript(cwd, envVars);
	dbg.command(exe, args);
	dbg.writeBack('last-instance').catch(e => console.error('DebugScript::writeBack - ', e));
	
	console.log('\x1B[38;5;10m%s\x1B[0m\n\x1B[38;5;11m%s\x1B[0m\n\x1B[38;5;14mcwd: %s\x1B[0m',
		exe, args.map((e, i) => `  ${i}: ${e}`).join('\n'), cwd);
	const cp = spawn(exe, args, {
		cwd,
		stdio: ['inherit', 'pipe', 'pipe'],
		shell: true,
		windowsVerbatimArguments: true,
		windowsHide: true,
		env: envVars,
	});
	cp.stdout.pipe(process.stdout);
	cp.stderr.pipe(process.stderr);
	
	handleProcessReference(cp, channel);
	
	return cp;
}

enum LogLevel {
	LOG = 'LOG  ',
	ERROR = 'ERROR',
}

export async function spawnIDE(args: string[], cwd: string, envVars: any = {}, exe = '', opener?: BrowserWindow): Promise<void> {
	if (isQuitting()) {
		return;
	}
	
	if (!exe) {
		await executableResolved;
	}
	
	if (!exe) {
		[exe, args] = makeAppArg(exe, args);
	}
	
	console.log('spawnIDE:\n  exe=%s\n  args=%j\n  cwd=%s\n  env=%j)', exe, args, cwd, envVars);
	if (!isBuilt) {
		await new Promise((resolve, reject) => {
			dialog.showMessageBox(opener, {
				type: 'question',
				buttons: ['Prevent start', 'Really start',],
				defaultId: 1,
				title: 'Development message',
				message: 'running in development mode.\nIDE start progress paused.',
			} as MessageBoxOptions, (shoudContinue) => {
				if (shoudContinue) {
					resolve();
				} else {
					reject(new Error(DEVELOPER_PREVENT_START));
				}
			});
		});
	}
	
	await ensureIpcServer();
	
	const connectId = (++connId).toFixed(0);
	
	const currentLog = myProfilePath('logs/output-' + (new Date()).toISOString() + '.log');
	const logOut = createWriteStream(currentLog);
	registerCleanupStream(logOut, () => {
		if (cp) {
			cp.stdout.unpipe(logOut);
			cp.stderr.unpipe(logOut);
		}
	});
	
	const cp = newSpawn(exe, args, cwd, envVars, connectId);
	
	cp.stdout.pipe(logOut);
	cp.stderr.pipe(logOut);
	
	function log(tag: LogLevel, message: string, ...args: any[]) {
		const msg = format(`[${tag}] ${message}`, ...args);
		logOut.write(msg + '\n');
		console.error('[child]' + msg);
	}
	
	const p = new Promise((resolve, reject) => {
		cp.once('my-stable', () => {
			resolve();
			cp.removeListener('error', logErr);
			cp.removeListener('exit', logExit);
		});
		const logErr = (e: Error) => {
			log(LogLevel.ERROR, 'Application spawn fail with [%s]', e.message);
			reject(e);
		};
		const logExit = (code: number, signal: string) => {
			// TODO: relaunch
			if (signal) {
				log(LogLevel.ERROR, 'Application kill with signal [%s]', signal);
			} else {
				log(LogLevel.ERROR, 'Application quit with code [%s]', code);
			}
			reject(new Error('application quit too early'));
		};
		cp.on('error', logErr);
		cp.on('exit', logExit);
	});
	
	async function waitInit() {
		const channel = await createIpcChannel(connectId);
		
		alwaysPromise(streamPromise(channel.socket), () => {
			cp.kill('SIGINT');
		});
		
		channel.once('please-relaunch', (arg, response) => {
			muteQuit();
			cp.once('exit', () => {
				afterWord(spawnIDE(args, cwd, envVars, exe));
			});
			response();
		});
		channel.once('please-update', (arg, response) => {
			afterWord(gracefulRestart());
			response();
		});
		channel.on('please-create-log-zip', (arg, response) => {
			if (envVars.IS_SOURCE_RUN) {
				response(new Error('Source code version is not supported.'));
			} else {
				createLogPack(args, cwd, envVars).then(response, response);
			}
		});
		
		channel.send('stable', '').then(() => {
			cp.emit('my-stable');
		});
	}
	
	cp.once('exit', () => {
		closeIpcChannel(connectId);
	});
	
	await Promise.all([
		p,
		waitInit(),
	]);
	
	cp.stdout.unpipe(logOut);
	cp.stderr.unpipe(logOut);
	try {
		logOut.write('---- unpipe original output ----');
		logOut.close();
	} catch (e) {
	}
}
