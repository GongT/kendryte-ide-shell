import { readFileSync } from 'fs';
import { join } from 'path';
import { compressedFileName } from '../gulp-shell-build/release.compress';
import { createReleaseTag } from '../gulp-shell-build/releaseTag';
import { createCard } from './components/card';
import { createReleaseDownload, createUpdateDownload } from './components/createDownload';
import { buildHead } from './components/head';
import { notSupportHtml } from './components/not-supported';
import { wrapTable } from './components/wrapTable';

export async function createIndexFileContent(): Promise<string> {
	const pieces: string[] = [
		'<!DOCTYPE html>',
		'<html>',
	];
	
	await buildHead(pieces);
	
	pieces.push(`<body class="en container">`);
	pieces.push(`<div style="text-align:right;">
<span class="en">Last update of this page:</span>
<span class="cn">本页面更新时间：</span>
<span class="date">${(new Date()).toISOString()}</span>
</div>`);
	pieces.push(readFileSync(join(__dirname, 'components/intro.html'), 'utf8'));
	pieces.push(notSupportHtml());
	pieces.push('<div id="platformContainer" class="row">');
	
	const versionString = createReleaseTag();
	
	const downWin32 = compressedFileName('win32');
	const packageWin32 = '';
	const downLinux = compressedFileName('linux');
	const packageLinux = '';
	const downDarwin = compressedFileName('darwin');
	const packageMac = '';
	
	pieces.push(
		createCard('Windows', versionString,
			wrapTable('application', await createReleaseDownload(downWin32)),
			wrapTable('packages', await createUpdateDownload(packageWin32)),
		),
		createCard('Linux', versionString,
			wrapTable('application', await createReleaseDownload(downLinux)),
			wrapTable('packages', await createUpdateDownload(packageLinux)),
		),
		createCard('Mac', versionString,
			wrapTable('application', await createReleaseDownload(downDarwin)),
			wrapTable('packages', await createUpdateDownload(packageMac)),
		),
	);
	
	pieces.push('</div>');
	
	const scriptFile = join(__dirname, 'components/script.ts');
	const scriptData = require('typescript').transpile(
		readFileSync(scriptFile, 'utf8'),
		{
			lib: ['esnext', 'dom'],
		},
	);
	pieces.push(`<script type="text/javascript">${scriptData}</script>`);
	
	pieces.push('</body>');
	pieces.push('</html>');
	
	return pieces.join('\n');
}