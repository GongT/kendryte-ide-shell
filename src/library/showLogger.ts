import { remote } from 'electron';
import { WINDOW_HEIGHT, WINDOW_WIDTH, WINDOW_WIDTH_WITH_LOG } from './constants';

export function toggleLoggerVisible(shown?: boolean) {
	if (arguments.length === 0) {
		shown = document.body.classList.toggle('showLog');
	} else if (shown) {
		document.body.classList.add('showLog');
	} else {
		document.body.classList.remove('showLog');
	}
	const diff = Math.ceil((WINDOW_WIDTH_WITH_LOG - WINDOW_WIDTH) / 2);
	const w = remote.getCurrentWindow();
	const [original] = w.getSize();
	let newSize: number;
	if (shown) {
		newSize = WINDOW_WIDTH_WITH_LOG;
	} else {
		newSize = WINDOW_WIDTH;
	}
	
	const container: HTMLDivElement = document.querySelector('div.container');
	container.style.width = (newSize - 20) + 'px';
	w.setSize(newSize, WINDOW_HEIGHT);
	
	if (newSize === original) {
		return;
	}
	
	const pos = w.getPosition();
	if (pos[0] <= 0) {
		return;
	}
	if (shown) {
		pos[0] -= diff;
	} else {
		pos[0] += diff;
	}
	w.setPosition(pos[0], pos[1]);
}
