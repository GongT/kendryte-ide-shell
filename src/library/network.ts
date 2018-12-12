import MultipartDownload = require('multipart-download');
import { basename, dirname } from 'path';

export function downloadFile(url: string, saveTo: string) {
	const download = new MultipartDownload();
	download.start(url, {
		numOfConnections: 5,
		saveDirectory   : dirname(saveTo),
		fileName        : basename(saveTo),
	});

	download.on('data', (data, offset) => {
		console.log('data!', offset);
	});
	download.on('error', (err) => {
		console.log('error!', err);
	});
	download.on('end', (output) => {
		console.log('end!', output);
	});
}

export function loadJson<T>(url: string): Promise<T> {
	return fetch(url).then((res) => {
		if (res.status === 200) {
			return res.json();
		} else {
			throw new Error(`${res.status}: ${res.statusText}`);
		}
	});
}

