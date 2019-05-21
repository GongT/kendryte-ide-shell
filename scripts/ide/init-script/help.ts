import { chmodSync, createWriteStream, existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { ensureDirSync } from 'fs-extra';
import { resolve } from 'path';
import { PassThrough } from 'stream';
import { isCI, isWin, PRIVATE_BINS } from '../../environment';
import { helpPrint, helpStringCache, whatIsError, whatIsThis } from '../../library/misc/help';
import { resolvePath } from '../../library/misc/pathUtil';

process.argv.push('--what-is-this');

const refresh = process.argv.indexOf('-r') > 0;

if (!isCI) {
	if (!refresh && existsSync(helpStringCache())) {
		process.stderr.write(readFileSync(helpStringCache()));
		process.exit(0);
	}
}

const myCreatedCommands = resolvePath(PRIVATE_BINS, '.commands.lst');
const oldCommands: {[id: string]: boolean} = existsSync(myCreatedCommands)? JSON.parse(readFileSync(myCreatedCommands, 'utf-8')) : {};
const newCommands: {[id: string]: boolean} = {};

ensureDirSync(process.env.TEMP);
const out = helpPrint(new PassThrough());
const cacheFile = helpStringCache();
if (existsSync(cacheFile)) {
	unlinkSync(cacheFile);
}
out.pipe(createWriteStream(cacheFile));
out.pipe(process.stderr);

whatIsThis('Print this (-r to refresh)', '显示这些提示（-r刷新缓存）', 'show-help');
const base = resolve(__dirname, '../commands');

readdirSync(base).forEach((file) => {
	if (!file.endsWith('.js')) {
		return;
	}

	generateCommand(file.replace(/\.js$/, ''));

	try {
		require(resolve(__dirname, '../commands', file));
	} catch (e) {
		whatIsError(`--------------
Loading file: ${file}
${e.stack}
----------------

`);
		whatIsThis(e.message, e.message, 'ErrCmd');
	}
});

whatIsThis('change directory to kendryte-ide', '切换到 kendryte-ide', 'd1', 'tool');
whatIsThis('change directory to kendryte-ide-shell', '切换到 kendryte-ide-shell', 'd2', 'tool');
whatIsThis('source the fake aws credentials', '载入假的aws信息', 'fake-aws', 'tool');
if (isWin) {
	whatIsThis('Open new window like this', '打开一个新窗口', 'fork', 'tool');
}

Object.keys(oldCommands).forEach((removedCommand) => {
	const path = resolvePath(PRIVATE_BINS, removedCommand);
	if (existsSync(path)) {
		unlinkSync(path);
	}
	if (existsSync(path + '.ps1')) {
		unlinkSync(path + '.ps1');
	}
});

writeFileSync(myCreatedCommands, JSON.stringify(newCommands), 'utf-8');

function generateCommand(cmd: string) {
	delete oldCommands[cmd];

	const file = resolvePath(PRIVATE_BINS, cmd);
	const loader = resolve(__dirname, 'load-command.js');

	if (isWin) {
		delete oldCommands[cmd + '.ps1'];
		newCommands[cmd + '.ps1'] = true;
		writeFileSync(file + '.ps1', `
node '${loader}' "${cmd}" @args
if (!$?) {
	throw "Command failed with code $LastExitCode"
}
`, 'utf8');
	} else {
		newCommands[cmd] = true;
		writeFileSync(file, `#!/bin/bash
function die() {
	echo -en "\\e[38;5;9m" >&2
	echo -en "$*" >&2
	echo -e "\\e[0m" >&2
	exit 1
}
node ${JSON.stringify(loader)} '${cmd}' "$@" || die "Command failed with code $?"
`, 'utf8');
		chmodSync(file, '0777');
	}
}
