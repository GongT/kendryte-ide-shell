import { ipcMain } from 'electron';

let lastKnownApp = '';
ipcMain.on('spawn', (event: any, exe: string) => {
	set(exe);
});
export const executableResolved = new Promise<string>((resolve, reject) => {
	ipcMain.once('spawn', (event: any, exe: string) => {
		set(exe);
		resolve();
	});
});

function set(exe: string) {
	if (lastKnownApp === exe) {
		return;
	}
	console.log('ide application is set to: ' + exe);
	lastKnownApp = exe;
}

export function getLastKnownApp() {
	return lastKnownApp;
}
