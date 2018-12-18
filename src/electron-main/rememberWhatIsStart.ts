import { Event, ipcMain } from 'electron';

let lastKnown: string[]|string = '';
ipcMain.on('spawn', (event: Event, exe: string|string[], args: string[], cwd: string, env: any) => {
	set(exe, env);
});
export const executableResolved = new Promise<string>((resolve, reject) => {
	ipcMain.once('spawn', (event: Event, exe: string|string[], args: string[], cwd: string, env: any) => {
		set(exe, env);
		resolve();
	});
});

function set(exe: string[]|string, env: any) {
	console.log('ide application is set to: ' + exe);
	lastKnown = exe;
	Object.assign(process.env, env);
}

export function getLastKnownApp() {
	return lastKnown;
}
