import { BrowserWindow, screen, shell } from 'electron';
import { resolve } from 'path';
import { WINDOW_HEIGHT, WINDOW_WIDTH, WINDOW_WIDTH_WITH_LOG } from '../library/constants';
import { isQuitting } from './lifecycleMain';

export function startUpdater() {
	if (isQuitting()) {
		return;
	}
	const bounds = screen.getPrimaryDisplay().bounds;
	const x = Math.ceil(bounds.x + ((bounds.width - WINDOW_WIDTH) / 2));
	const y = Math.ceil(bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2));
	
	console.log('creating progress window...');
	const win = new BrowserWindow({
		width: WINDOW_WIDTH,
		minWidth: WINDOW_WIDTH,
		maxWidth: WINDOW_WIDTH_WITH_LOG,
		height: WINDOW_HEIGHT,
		minHeight: WINDOW_HEIGHT,
		maxHeight: WINDOW_HEIGHT,
		x: Math.ceil(x / 3),
		y: Math.ceil(y / 3),
		resizable: true,
		fullscreenable: false,
		title: 'Initializing...',
		// icon:
		show: false,
		frame: false,
		backgroundColor: '#2a2a2a',
		darkTheme: true,
		maximizable: false,
		webPreferences: {
			nodeIntegration: true,
		},
	});
	// win.webContents.openDevTools({mode: 'detach'});
	
	const handleRedirect = (e: Event, url: string) => {
		if (url != win.webContents.getURL()) {
			e.preventDefault();
			shell.openExternal(url);
		}
	};
	
	win.webContents.on('will-navigate', handleRedirect);
	win.webContents.on('new-window', handleRedirect);
	
	win.on('ready-to-show', () => {
		win.show();
	});
	win.loadFile(resolve(__dirname, '..', 'index.html'));
}
