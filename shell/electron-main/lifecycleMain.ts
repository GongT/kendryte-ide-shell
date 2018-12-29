import { ChildProcess } from 'child_process';
import { app, BrowserWindow, Event } from 'electron';
import { alertError } from '../electron-main/alertError';
import { doCleanup } from '../library/lifecycle';
import { processPromise } from '../library/processPromise';
import { timeout } from '../library/timeout';
import { send } from './ipc';
import { startUpdater } from './startWindow';

let windows = 0;
let processes = new Map<ChildProcess, string>();
let quit = false;
let _muteQuit = false;

export function handleProcessReference(cp: ChildProcess, id: string) {
	processes.set(cp, id);
	cp.once('exit', (code: number, signal: string) => {
		processes.delete(cp);
		updateQuitStatus();
	});
}

export function isQuitting() {
	return quit;
}

export function afterWord(p: Promise<void>) {
	_muteQuit = false;
	p.catch((e) => {
		console.error(e);
		gracefulQuit();
	});
}

export function gracefulQuit() {
	console.log('call gracefulQuit()');
	if (_muteQuit) {
		console.log('   - but muted');
		_muteQuit = false;
		return;
	}
	quit = true;
	setTimeout(() => {
		app.quit();
	}, 10000);
	app.removeAllListeners('before-quit');
	doCleanup().then(() => {
		app.quit();
	}, alertError);
}

export function muteQuit() {
	_muteQuit = true;
}

export async function gracefulRestart(): Promise<void> {
	console.log('call gracefulRestart()');
	quit = true;
	BrowserWindow.getAllWindows().forEach((win) => {
		win.close();
	});
	processes.forEach((id, cp) => {
		send(id, 'please-quit', '');
	});
	await Promise.all(
		Array.from(processes.keys()).map((cp) => {
			return processPromise(cp, ['???'], '???');
		}),
	);
	
	await timeout(2000);
	
	quit = false;
	
	startUpdater();
}

function updateQuitStatus() {
	console.log('updateQuitStatus', windows, processes.size, quit);
	if (windows === 0 && processes.size === 0 && !quit) {
		gracefulQuit();
	}
}

app.on('before-quit', (e: Event) => {
	e.preventDefault();
	console.error('!! before-quit');
	updateQuitStatus();
});
app.on('window-all-closed', (e: Event) => {
	e.preventDefault();
});
app.on('browser-window-created', (e, window) => {
	windows++;
	console.error('!! browser-window-created');
	window.on('closed', () => {
		console.error('!! closed');
		windows--;
		updateQuitStatus();
	});
});
