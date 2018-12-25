'use strict';

import { WINDOW_WIDTH } from './library/constants';
import { doCleanup } from './library/lifecycle';
import { createLogger } from './library/logger';
import { toggleLoggerVisible } from './library/showLogger';
import { timeout } from './library/timeout';
import { ISelfConfig, loadApplicationData } from './main/appdata';
import { handleError } from './main/error';
import { startMainLogic } from './main/main';

document.getElementById('viewMain').style.width = (WINDOW_WIDTH - 20) + 'px';
toggleLoggerVisible(false);

window.scrollTo(0, 0);
window.addEventListener('beforeUnload', () => {
	window.scrollTo(0, 0);
});

const userCancelError = new Error('user cancel');

function userCancel() {
	return new Promise((resolve, reject) => {
		document.querySelector('#btnQuit').addEventListener('click', () => {
			console.log('btnQuit clicked');
			reject(userCancelError);
		});
	});
}

document.getElementById('btnLog').addEventListener('click', () => toggleLoggerVisible());
if (document.readyState === 'complete') {
	bootstrap();
} else {
	document.addEventListener('DOMContentLoaded', bootstrap);
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
			await createLogger(
				document.querySelector('#viewMain .doing .line1'),
				document.querySelector('#viewMain .doing .line2'),
				document.querySelector('#viewMain .doing .line3'),
				document.querySelector('#progressBar'),
				document.querySelector('#viewLog>.logText'),
			);
			return data;
		})
		.then(animate)
		.then(startMainLogic)
		.then(() => {
			console.info('Great! All jobs are done.');
			return true;
		})
		.catch(handleError);
}

async function animate(data: ISelfConfig) {
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

