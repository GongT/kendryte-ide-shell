import { app, BrowserWindow, Event, ipcMain, Menu, MenuItem } from 'electron';
import { ensureDirSync } from 'fs-extra';
import { alertError } from './electron-main/alertError';
import { spawnIDE } from './electron-main/spawn';
import { startUpdater } from './electron-main/startWindow';
import { isBuilt, myProfilePath } from './library/environment';

app.setPath('userData', myProfilePath('.'));

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (event, argv: string[], workDir: string) => {
		argv.shift(); // electron
		if (!isBuilt) {
			argv.shift(); // .
		}
		spawnIDE(argv, workDir).catch(alertError);
	});
}

app.on('ready', () => {
	const menu = new Menu();
	ipcMain.on('contextmenu', (event: Event) => {
		menu.popup({
			window: BrowserWindow.fromWebContents(event.sender),
		});
	});
	menu.append(new MenuItem({
		label: 'Copy Log',
		click: (menuItem, browserWindow) => {
			return browserWindow.webContents.executeJavaScript('copyLog()');
		},
	}));
	menu.append(new MenuItem({
		label: 'Open DevTools',
		click: (menuItem, browserWindow) => {
			browserWindow.webContents.openDevTools({mode: 'detach'});
		},
	}));
	
	ensureDirSync(myProfilePath('logs'));
	setImmediate(startUpdater);
});

ipcMain.on('spawn', (event: Event, exe: string, args: string[], cwd: string, env: any) => {
	console.log('main#spawn:', args.join(' '));
	spawnIDE(args, cwd, env, null, BrowserWindow.fromWebContents(event.sender)).then(() => {
		console.log('send spawnCallback without error');
		event.sender.send('spawnCallback');
	}, (e) => {
		console.log('send spawnCallback with error', e);
		event.sender.send('spawnCallback', {
			message: e.message,
			stack: e.stack,
			name: e.name,
		});
	});
});
