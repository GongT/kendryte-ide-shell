import { compress } from '7zip-bin-wrapper';
import { copy, mkdirp, pathExists, readdir, unlink, writeFile, writeJSON } from 'fs-extra';
import { getLastKnownApp } from '../electron-main/rememberWhatIsStart';
import { applicationPath, configFile, contentRoot, localPackagePath, myProfilePath, nativePath, tempDir } from './environment';

export async function createLogPack(args: string[], cwd: string, envVars: any) {
	const resultPath = tempDir('report-' + Date.now().toFixed(0));
	await mkdirp(resultPath);
	
	await writeJSON(nativePath(resultPath, 'command.json'), {
		lastStart: getLastKnownApp(),
		cwd,
		args,
		envVars,
	});
	
	await copyLog(myProfilePath('logs'), nativePath(resultPath, 'my-logs'));
	await copyLog(nativePath(envVars.VSCODE_PORTABLE, 'user-data/logs'), nativePath(resultPath, 'app-logs'));
	
	await writeJSON(nativePath(resultPath, 'extensions.json'), {
		data: await listDir(nativePath(envVars.VSCODE_PORTABLE, 'extensions')),
		pack: await listDir(localPackagePath('.')),
		app: await listDir(applicationPath('.')),
		inter: await listDir(nativePath(envVars.VSCODE_PATH, 'resources/app/extensions')),
	});
	
	await copy(configFile, nativePath(resultPath, 'channel.json'));
	
	const zipDir = nativePath(contentRoot, 'Reports');
	await mkdirp(zipDir);
	const zip = nativePath(zipDir, 'report.7z');
	if (await pathExists(zip)) {
		await unlink(zip);
	}
	
	const handler = compress(zip, resultPath);
	handler.on('output', (data: string) => {
		console.error(data);
	});
	await handler.promise();
	
	return zipDir;
}

async function copyLog(from: string, to: string) {
	if (await pathExists(from)) {
		await copy(from, to);
	} else {
		await mkdirp(to);
		await writeFile(nativePath(to, 'empty'), from);
	}
}

function listDir(f: string) {
	return readdir(f).catch((e) => {
		return e.stack;
	});
}