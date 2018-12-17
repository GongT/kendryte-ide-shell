import { ChildProcess } from 'child_process';
import { app, Event } from 'electron';
import { alertError } from '../electron-main/alertError';
import { doCleanup } from '../library/lifecycle';

let windows = 0;
let processes = 0;
let quit = false;

export function handleProcessReference(cp: ChildProcess) {
	processes++;
	cp.once('exit', (code: number, signal: string) => {
		processes--;
		updateQuitStatus();
	});
}

export function isQuitting() {
	return quit;
}

export function gracefulQuit() {
	console.log('call gracefulQuit()');
	quit = true;
	app.removeAllListeners('before-quit');
	doCleanup().then(() => {
		app.quit();
	}, alertError);
}

function updateQuitStatus() {
	console.log('updateQuitStatus', windows, processes, quit);
	if (windows === 0 && processes === 0 && !quit) {
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
