import { resolve } from 'path';
import { extract } from 'tar-fs';
import { RELEASE_ROOT, VSCODE_ROOT } from '../../environment';
import { getOutputCommand, pipeCommandBoth, simpleCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { isExists, readFile, writeFile } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { removeDirectory } from '../codeblocks/removeDir';

whatIsThis(
	'Fetch Microsoft VS Code official update. push to "origin/microsoft"',
	'从微软 VS Code 官方源拉更改，然后推到 "origin/microsoft"',
);

runMain(async () => {
	chdir(VSCODE_ROOT);
	
	log('checking exists upstream working tree...');
	await removeDirectory('.release/follow-upstream');
	await simpleCommandOut('git', 'worktree', 'prune');
	log('cleared upstream working tree...');
	
	log('fetching origin upstream branch...');
	await simpleCommandOut('git', 'fetch', 'origin', 'microsoft');
	log('origin upstream branch fetched.');
	
	log('checking out upstream working tree...');
	await simpleCommandOut('git', 'worktree', 'add', '-f', '.release/follow-upstream', 'origin/microsoft');
	log('upstream working tree checked out.');
	
	const followBranchDir = resolve(RELEASE_ROOT, 'follow-upstream');
	chdir(followBranchDir);
	const gitFileData = await readFile('.git');
	const lastLog = await getOutputCommand('git', 'log', '-1', '--format=%s');
	const lastHash = lastLog.trim().split(/\n/g)[0].split('#').pop().trim().toLowerCase();
	log(`last following commit is: {${lastHash}}`);
	if (!/^[0-9a-f]{40}$/.test(lastHash)) {
		throw new Error('Fatal: remote branch log is wrong.');
	}
	
	chdir(RELEASE_ROOT);
	await removeDirectory(followBranchDir);
	
	const upstreamStorage = process.env.MICROSOFT_VSCODE_ROOT || resolve(VSCODE_ROOT, '..', 'MicrosoftVSCode');
	if (await isExists(upstreamStorage)) {
		log('upstream vscode repo is exists. update it.');
		chdir(upstreamStorage);
		await simpleCommandOut('git', 'fetch', 'origin', 'master');
	} else {
		log('upstream vscode repo is not exists.');
		await simpleCommandOut('git', 'clone', '--bare', '-b', 'master', '--single-branch', 'https://github.com/Microsoft/vscode.git', upstreamStorage);
		chdir(upstreamStorage);
	}
	const latestMicrosoftCommit = await getOutputCommand('git', 'rev-parse', 'origin/master');
	log('upstream vscode is up to date. last commit is: ' + latestMicrosoftCommit);
	
	const logs = await getOutputCommand('git', 'log', '--format=%h %s', 'origin/master', `${lastHash}...origin/master`);
	const cnt = logs.trim().split(/\n/g).length;
	if (cnt === 1 && logs.trim().length === 0) {
		log('Remote hash not changed, update terminated.');
		return;
	}
	log(`${cnt} new commits from microsoft`);
	
	log('extracting source code...');
	const untar = extract(followBranchDir);
	await pipeCommandBoth(untar, process.stderr, 'git', 'archive', '--format', 'tar', 'origin/master');
	await removeDirectory(resolve(followBranchDir, '.git'));
	await writeFile(resolve(followBranchDir, '.git'), gitFileData);
	log('extracted source code.');
	
	const myNextCommitLog = `sync with upstream # ${latestMicrosoftCommit}\n\n${logs.trim()}\n`;
	const commitLogFile = resolve(process.env.TEMP, 'follow-upstream.commit.log');
	await writeFile(commitLogFile, myNextCommitLog);
	
	chdir(followBranchDir);
	log('commit working tree...');
	await simpleCommandOut('git', 'add', '.');
	await simpleCommandOut('git', 'commit', '.', '--no-verify', '--file=' + commitLogFile);
	log('commit success.');
	
	log('pushing...');
	await simpleCommandOut('git', 'push', 'origin', 'HEAD:microsoft');
	log('push success.');
	
	log('cleaning...');
	chdir(RELEASE_ROOT);
	await removeDirectory('.release/follow-upstream');
	await simpleCommandOut('git', 'worktree', 'prune');
	
	log('Done.');
});
