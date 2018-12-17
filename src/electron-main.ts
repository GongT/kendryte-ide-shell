import { app, Event, ipcMain } from 'electron';
import { ensureDirSync } from 'fs-extra';
import { alertError } from './electron-main/alertError';
import { spawnIDE } from './electron-main/spawn';
import { startUpdater } from './electron-main/startWindow';
import { myProfilePath } from './library/environment';

app.setPath('userData', myProfilePath('.'));

app.on('second-instance', (event, argv: string[], workDir: string) => {
	spawnIDE(argv, workDir).catch(alertError);
});

app.on('ready', () => {
	ensureDirSync(myProfilePath('logs'));
	setImmediate(() => {
		startUpdater();
	});
});

ipcMain.on('spawn', (event: Event, exe: string, args: string[], cwd: string, env: any) => {
	console.log('main#spawn:', args.join(' '));
	spawnIDE(args, cwd, env).then(() => {
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
