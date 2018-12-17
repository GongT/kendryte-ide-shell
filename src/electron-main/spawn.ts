import { ChildProcess, spawn } from 'child_process';
import { createWriteStream } from 'fs-extra';
import { format } from 'util';
import { alwaysPromise } from '../library/alwaysPromise';
import { contentRoot, isBuilt, myProfilePath } from '../library/environment';
import { registerCleanupStream } from '../library/lifecycle';
import { streamPromise } from '../library/streamPromise';
import { DebugScript } from './debugScript';
import { closeIpcChannel, createIpcChannel, ensureIpcServer, ipcPipe } from './ipc';
import { handleProcessReference, isQuitting } from './lifecycleMain';
import { executableResolved, getLastKnownApp } from './rememberWhatIsStart';

let connId = 0;
const pool = new Map<string, ChildProcess>();

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

function realSpawn(args: string[], cwd: string, envVars: any, channel: string) {
	const inspectPortArg = args.indexOf('--inspect-brk=') || args.indexOf('--inspect=');
	if (inspectPortArg !== -1) {
		args[inspectPortArg] = args[inspectPortArg].split('=')[0] + '=' + detectInspectPortToUse();
	}
	const inspectArg = args.indexOf('--inspect-brk') || args.indexOf('--inspect');
	if (inspectArg !== -1) {
		args[inspectArg] += '=' + detectInspectPortToUse();
	}
	
	const exe = getLastKnownApp();
	const env = {
		...process.env,
		KENDRYTE_IDE_UPDATER: process.argv0,
		KENDRYTE_IDE_UPDATER_IS_BUILT: isBuilt? 'yes' : '',
		KENDRYTE_IDE_UPDATER_CONTENT_ROOT: contentRoot,
		KENDRYTE_IDE_UPDATER_PIPE: ipcPipe,
		KENDRYTE_IDE_UPDATER_PIPE_ID: channel,
		...envVars,
	};
	
	const dbg = new DebugScript(cwd, env);
	dbg.command(exe, args);
	dbg.writeBack('last-instance').catch(e => console.error('DebugScript::writeBack - ', e));
	
	const cp = spawn(exe, args, {
		cwd,
		stdio: ['inherit', 'pipe', 'pipe'],
		shell: true,
		windowsVerbatimArguments: true,
		windowsHide: true,
		env,
	});
	cp.stdout.pipe(process.stdout);
	cp.stderr.pipe(process.stderr);
	
	handleProcessReference(cp);
	
	return cp;
}

enum LogLevel {
	LOG = 'LOG  ',
	ERROR = 'ERROR',
}

export async function spawnIDE(args: string[], cwd: string, envVars: any = {}): Promise<void> {
	if (isQuitting()) {
		return;
	}
	await executableResolved;
	await ensureIpcServer();
	
	const connectId = (++connId).toFixed(0);
	
	const logOut = createWriteStream(myProfilePath('logs/output-' + (new Date()).toUTCString() + '.log'));
	const close = registerCleanupStream(logOut, () => {
		if (cp) {
			cp.stdout.unpipe(logOut);
			cp.stderr.unpipe(logOut);
		}
	});
	
	console.error('\n\n------------------------\n');
	const cp = realSpawn(args, cwd, envVars, connectId);
	
	cp.stdout.pipe(logOut);
	cp.stderr.pipe(logOut);
	
	function log(tag: LogLevel, message: string, ...args: any[]) {
		const msg = format(`[${tag}] ${message}`, ...args);
		try {
			logOut.write(msg + '\n');
		} catch (e) {
		}
		console.error('[child]' + msg);
	}
	
	const p = new Promise((resolve, reject) => {
		cp.on('error', (e) => {
			log(LogLevel.ERROR, 'Application spawn fail with [%s]', e.message);
			reject(e);
		});
		cp.once('exit', (code: number, signal: string) => {
			// TODO: relaunch
			if (signal) {
				log(LogLevel.ERROR, 'Application kill with signal [%s]', signal);
			} else {
				log(LogLevel.ERROR, 'Application quit with code [%s]', code);
			}
			reject(new Error('application quit too early'));
		});
	});
	
	pool.set(connectId, cp);
	alwaysPromise(p, () => { // on process exit
		closeIpcChannel(connectId);
		pool.delete(connectId);
		
		cp.stdout.unpipe(logOut);
		cp.stderr.unpipe(logOut);
		
		try {
			logOut.write('---- unpipe output ----');
			close()();
		} catch (e) {
		}
	});
	
	const channel = await createIpcChannel(connectId);
	
	alwaysPromise(streamPromise(channel.socket), () => {
		cp.kill('SIGINT');
	});
	
	await channel.waitMessage('hello');
}
