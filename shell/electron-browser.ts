'use strict';

import { clipboard, ipcRenderer } from 'electron';
import { WINDOW_WIDTH } from './library/constants';
import { doCleanup } from './library/lifecycle';
import { createLogger } from './library/logger';
import { toggleLoggerVisible } from './library/showLogger';
import { timeout } from './library/timeout';
import { loadApplicationData } from './main/appdata';
import { handleError } from './main/error';
import { startMainLogic } from './main/main';

const userCancelError = new Error('user cancel');

function userCancel() {
	return new Promise((resolve, reject) => {
		document.querySelector('#btnQuit').addEventListener('click', () => {
			console.log('btnQuit clicked');
			reject(userCancelError);
		});
	});
}

export function main() {
	document.getElementById('viewMain').style.width = (WINDOW_WIDTH - 20) + 'px';
	toggleLoggerVisible(false);

	window.scrollTo(0, 0);
	window.addEventListener('beforeUnload', () => {
		window.scrollTo(0, 0);
	});

	document.getElementById('btnLog').addEventListener('click', () => toggleLoggerVisible());
	document.addEventListener('auxclick', (e: MouseEvent) => {
		if (e.which === 2) { // middle
			e.preventDefault();
		} else if (e.which === 3) {
			ipcRenderer.send('contextmenu');
		}
	}, false);

	Object.defineProperty(window, 'copyLog', {
		value() {
			const ele: HTMLDivElement = document.querySelector('#viewLog>div.logText');
			clipboard.writeText(ele.innerText);
		},
	});

	if (document.readyState === 'complete') {
		bootstrap();
	} else {
		document.addEventListener('DOMContentLoaded', bootstrap);
	}
}

function bootstrap() {
	const cancel = userCancel();
	Promise.all([
		mainLogic(), // main logic handle it's error
		cancel, // never resolve
	]).catch(async (e) => {
		await doCleanup();
		return e === userCancelError;
	}).then((needQuit: boolean) => {
		if (needQuit) {
			window.close();
		}
	});
}

function mainLogic(): Promise<boolean> {
	return Promise
		.resolve()
		.then(loadApplicationData)
		.then(async (data) => {
			const btnDown = document.getElementById('btnDownload') as HTMLAnchorElement;
			btnDown.href = data.downloadPage;
			await createLogger(
				document.querySelector('#viewMain .doing .line1'),
				document.querySelector('#viewMain .doing .line2'),
				document.querySelector('#viewMain .doing .line3'),
				document.querySelector('#progressBar'),
				document.querySelector('#viewLog>.logText'),
			);
		})
		.then(animate)
		.then(startMainLogic)
		.then(() => {
			console.info('Great! All jobs are done.');
			return true;
		})
		.catch(handleError);
}

async function animate() {
	const data = await loadApplicationData();
	const title = document.createElement('title');
	title.innerText = `${data.title} :: Auto Updater`;
	document.head.appendChild(title);

	console.info('animate');
	await timeout(1000);

	const $main = document.querySelector('#viewMain');
	$main.querySelector('.title').innerHTML = data.title;
	$main.querySelector('.subtitle').innerHTML = '(' + data.channel + ')';

	document.body.classList.add('run');
	return data;
}

