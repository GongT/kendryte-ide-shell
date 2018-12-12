'use strict';

import { WINDOW_HEIGHT, WINDOW_WIDTH, WINDOW_WIDTH_WITH_LOG } from '../library/constants';
import { remote } from 'electron';
import { startMainLogic } from '../main/main';
import { handleError } from '../main/error';
import { createLogger } from '../library/logger';
import { doCleanup } from '../library/lifecycle';
import { loadApplicationData, ISelfConfig } from '../main/appdata';
import { timeout } from '../library/timeout';

const container: HTMLDivElement = document.querySelector('div.container');
document.getElementById('viewMain').style.width = (WINDOW_WIDTH - 20) + 'px';
resizing(false);

window.scrollTo(0, 0);
window.addEventListener('beforeUnload', () => {
	window.scrollTo(0, 0);
});

function resizing(shown: boolean = document.body.classList.toggle('showLog')) {
	const diff = Math.ceil((WINDOW_WIDTH_WITH_LOG - WINDOW_WIDTH) / 2);
	const w = remote.getCurrentWindow();
	const [original] = w.getSize();
	let newSize: number;
	if (shown) {
		newSize = WINDOW_WIDTH_WITH_LOG;
	} else {
		newSize = WINDOW_WIDTH;
	}

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

document.getElementById('btnLog').addEventListener('click', () => resizing());
if (document.readyState === 'complete') {
	bootstrap();
} else {
	document.addEventListener('DOMContentLoaded', bootstrap);
}

function bootstrap() {
	Promise.resolve()
		.then(loadApplicationData)
		.then(async (data) => {
			await createLogger(
				document.querySelector('#viewMain .doing .line1'),
				document.querySelector('#viewMain .doing .line2'),
				document.querySelector('#progressBar'),
				document.querySelector('#viewLog>.logText'),
			);
			return data;
		})
		.then(animate)
		.then(startMainLogic)
		.then(doCleanup)
		.catch(handleError);
}

async function animate(data: ISelfConfig) {
	console.info('animate');
	await timeout(1000);

	const $main = document.querySelector('#viewMain');
	$main.querySelector('.title').innerHTML = data.title;
	$main.querySelector('.subtitle').innerHTML = '(' + data.channel + ')';

	document.body.classList.add('run');
	return data;
}

