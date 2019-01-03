import { IncomingMessage } from 'http';
import { extname } from 'path';
import { log } from '../../library/gulp';
import { humanSize } from '../../library/humanSize';
import { ExS3 } from '../../library/misc/awsUtil';
import { request } from '../../library/misc/httpUtil';
import { AWS_RELEASE_PACKAGES_PATH, AWS_RELEASE_UPDATER_PATH } from '../../library/releaseInfo/s3Keys';
import { styleMainType } from './styleMainType';

export async function createReleaseDownload(name: string) {
	const key = name? `${AWS_RELEASE_UPDATER_PATH}${name}` : name;
	return `<tr>
	<th colspan="3">
		<span>Kendryte IDE</span>
	</th>
</tr>
${await createDownload(key, 'btn-' + styleMainType())}
`;
}

export async function createUpdateDownload(name: string) {
	const key = name? `${AWS_RELEASE_PACKAGES_PATH}${name}` : name;
	return `<tr>
	<th colspan="3">
		<span class="en">Offline Dependency Packages</span>
		<span class="cn">离线依赖包</span>
	</th>
</tr>
${await createDownload(key, 'btn-' + styleMainType())}
`;
}

async function createDownload(key: string, btnClass: string) {
	if (!key) {
		return `
<tr>
	<td colspan="3">
		<span class="en">Coming soon, Please wait...</span>
		<span class="cn">制作中，请稍后再来……</span>
	</td>
</tr>
`;
	}
	const {md5, size, time} = await getFileInfo(key);
	const sizeStr = humanSize(size);
	
	const url = ExS3.instance().websiteUrl(key);
	return `<tr>
	<td>
		<a class="en btn ${btnClass}" href="${url}">Download</a>
		<a class="cn btn ${btnClass}" href="${url}">下载</a>
	</td>
	<td>${extname(key)}</td>
	<td>${sizeStr}</td>
</tr>
<tr>
	<td colspan="3"><span class="badge badge-info">MD5:</span>&nbsp;${md5}</td>
</tr>
<tr>
	<td colspan="3"><span class="badge badge-info">Time:</span>&nbsp;<span class="date">${time}</span></td>
</tr>`;
}

async function getFileInfo(key: string): Promise<{md5: string, size: string, time: string}> {
	log('Get information of file: %s', ExS3.instance().websiteUrl(key));
	const md5FileKey = key + '.md5';
	let {size, time} = await getHeadInfo(ExS3.instance().websiteUrl(key)).catch((e) => {
		log.warn('Failed with error: ', e.message);
		return {} as any;
	});
	if (!time) {
		time = 'Unknown';
	}
	
	log('    size: %s', size);
	log('    time: %s', time);
	if (!size) {
		log('    md5: Temporary unavailable.');
		return {
			md5: 'Temporary unavailable.',
			size: '???',
			time,
		};
	}
	
	let md5 = await ExS3.instance().loadText(md5FileKey).catch((e: Error) => {
		log.warn('Failed with error: ', e.message);
		return 'Temporary unavailable.';
	});
	log('    md5: %s', md5);
	return {
		md5,
		size,
		time,
	};
}

function getHeadInfo(url: string) {
	return new Promise<{time: string; size: string}>((resolve, reject) => {
		request(url, {method: 'HEAD'}, (res: IncomingMessage) => {
			if (res.statusCode !== 200) {
				reject(new Error(res.statusMessage));
			} else {
				resolve({
					time: (new Date(Date.parse(res.headers['last-modified']))).toISOString(),
					size: res.headers['content-length'] as string,
				});
			}
		}).end();
	});
}
