import { resolve } from 'path';
import { extract } from 'tar-fs';
import { BUILD_ROOT, VSCODE_ROOT } from '../../environment';
import { getOutputCommandAt, pipeCommandBoth, simpleCommandAt, simpleCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { isExists, readFile, writeFile } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir, resolvePath } from '../../library/misc/pathUtil';
import { removeDirectory } from '../codeblocks/removeDir';

whatIsThis(
	'Fetch Microsoft VS Code official update. push to "origin/microsoft"',
	'从微软 VS Code 官方源拉更改，然后推到 "origin/microsoft"',
);

runMain(async () => {
	const tempPath = resolvePath(BUILD_ROOT, 'follow-upstream');
	
	log('checking exists upstream working tree...');
	await removeDirectory(tempPath);
	await simpleCommandAt(VSCODE_ROOT, 'git', 'worktree', 'prune');
	log('cleared upstream working tree...');
	
	log('fetching origin upstream branch...');
	await simpleCommandAt(VSCODE_ROOT, 'git', 'fetch', 'origin', 'microsoft');
	log('origin upstream branch fetched.');
	
	log('checking out upstream working tree...');
	await simpleCommandAt(VSCODE_ROOT, 'git', 'worktree', 'add', '-f', tempPath, 'origin/microsoft');
	log('upstream working tree checked out.');
	
	const gitFileData = await readFile(resolvePath(tempPath, '.git'));
	const lastLog = await getOutputCommandAt(tempPath, 'git', 'log', '-1', '--format=%s');
	const lastHash = lastLog.trim().split(/\n/g)[0].split('#').pop().trim().toLowerCase();
	log(`last following commit is: {${lastHash}}`);
	if (!/^[0-9a-f]{40}$/.test(lastHash)) {
		throw new Error('Fatal: remote branch log is wrong.');
	}
	
	await removeDirectory(tempPath);
	
	const upstreamStorage = process.env.MICROSOFT_VSCODE_ROOT || resolve(VSCODE_ROOT, '..', 'MicrosoftVSCode');
	if (await isExists(upstreamStorage)) {
		log('upstream vscode repo is exists. update it.');
		await simpleCommandAt(upstreamStorage, 'git', 'fetch', 'origin', 'master');
	} else {
		log('upstream vscode repo is not exists.');
		await simpleCommandAt(VSCODE_ROOT, 'git', 'clone', '--bare', '-b', 'master', '--single-branch', 'https://github.com/Microsoft/vscode.git', upstreamStorage);
	}
	const latestMicrosoftCommit = await getOutputCommandAt(upstreamStorage, 'git', 'rev-parse', 'origin/master');
	log('upstream vscode is up to date. last commit is: ' + latestMicrosoftCommit);
	
	const logs = await getOutputCommandAt(upstreamStorage, 'git', 'log', '--format=%h %s', 'origin/master', `${lastHash}...origin/master`);
	const cnt = logs.trim().split(/\n/g).length;
	if (cnt === 1 && logs.trim().length === 0) {
		log('Remote hash not changed, update terminated.');
		return;
	}
	log(`${cnt} new commits from microsoft`);
	
	chdir(upstreamStorage);
	log('extracting source code...');
	const untar = extract(tempPath);
	await pipeCommandBoth(untar, process.stderr, 'git', 'archive', '--format', 'tar', 'origin/master');
	await removeDirectory(resolve(tempPath, '.git'));
	await writeFile(resolve(tempPath, '.git'), gitFileData);
	log('extracted source code.');
	
	const myNextCommitLog = `sync with upstream # ${latestMicrosoftCommit}\n\n${logs.trim()}\n`;
	const commitLogFile = resolve(process.env.TEMP, 'follow-upstream.commit.log');
	await writeFile(commitLogFile, myNextCommitLog);
	
	chdir(tempPath);
	log('commit working tree...');
	await simpleCommandOut('git', 'add', '.');
	await simpleCommandOut('git', 'commit', '.', '--no-verify', '--file=' + commitLogFile);
	log('commit success.');
	
	log('pushing...');
	await simpleCommandOut('git', 'push', 'origin', 'HEAD:microsoft');
	log('push success.');
	
	log('cleaning...');
	chdir(VSCODE_ROOT);
	await removeDirectory(tempPath);
	await simpleCommandOut('git', 'worktree', 'prune');
	
	log('Done.');
});
