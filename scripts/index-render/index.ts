import { readFileSync } from 'fs';
import { myScriptSourcePath } from '../environment';
import { log } from '../library/gulp';
import { loadRemoteState } from '../library/jsonDefine/releaseRegistry';
import { resolvePath } from '../library/misc/pathUtil';
import { offlinePackageFileName } from '../library/paths/offlinePackages';
import { updaterFileName } from '../library/paths/updater';
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
	
	const registryFile = await loadRemoteState();
	const lastPatch = registryFile.linux && registryFile.linux.patchVersion;
	const lastVersion = registryFile.linux && registryFile.linux.version;
	
	log('version=%s', lastVersion);
	if (lastPatch) {
		log('lastPatch.version=%s', lastPatch);
	} else {
		log('lastPatch.version=No value');
	}
	log('updaterVersion=%s', registryFile.updaterVersion);
	log('offlinePackageVersion=%s', registryFile.offlinePackageVersion);
	
	await buildHead(pieces);
	
	pieces.push(`<body class="en container">`);
	pieces.push(`<div style="text-align:right;">

<span class="en">Last update time:</span>
<span class="cn">上次更新时间：</span>
<span class="date">${(new Date()).toISOString()}</span>
<span>&nbsp;&nbsp;&nbsp;</span>

<span class="en" style="font-weight:bold;">Versions:</span>
<span class="cn" style="font-weight:bold;">当前版本：</span>

<span class="en">main:</span>
<span class="cn">主程序：</span>
<span class="badge badge-info">${lastVersion || '???'}(${lastPatch || '???'})</span>
<span>&nbsp;</span>

<span class="en">updater:</span>
<span class="cn">更新器：</span>
<span class="badge badge-info">${registryFile.updaterVersion || '???'}</span>
<span>&nbsp;</span>

<span class="en">packages:</span>
<span class="cn">依赖包：</span>
<span class="badge badge-info">${registryFile.offlinePackageVersion || '???'}</span>

</div>`);
	pieces.push(readFileSync(resolvePath(myScriptSourcePath(__dirname), 'components/intro.html'), 'utf8'));
	pieces.push(notSupportHtml());
	pieces.push('<div id="platformContainer" class="row">');
	
	const downWin32 = updaterFileName('win32', registryFile.updaterVersion);
	const downLinux = updaterFileName('linux', registryFile.updaterVersion);
	const downDarwin = updaterFileName('darwin', registryFile.updaterVersion);
	
	const packageWin32 = offlinePackageFileName('win32', registryFile.offlinePackageVersion);
	const packageLinux = offlinePackageFileName('linux', registryFile.offlinePackageVersion);
	const packageMac = offlinePackageFileName('darwin', registryFile.offlinePackageVersion);
	
	pieces.push(
		createCard('Windows',
			wrapTable('application', await createReleaseDownload(downWin32)),
			wrapTable('packages', await createUpdateDownload(packageWin32)),
		),
		createCard('Linux',
			wrapTable('application', await createReleaseDownload(downLinux)),
			wrapTable('packages', await createUpdateDownload(packageLinux)),
		),
		createCard('Mac',
			wrapTable('application', await createReleaseDownload(downDarwin)),
			wrapTable('packages', await createUpdateDownload(packageMac)),
		),
	);
	
	pieces.push('</div>');
	
	const scriptFile = resolvePath(myScriptSourcePath(__dirname), 'components/script.ts');
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
