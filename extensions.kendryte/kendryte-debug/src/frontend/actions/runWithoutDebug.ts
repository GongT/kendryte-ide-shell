import * as vscode from 'vscode';
import { ChannelLogger } from '../logger';
import { resolve } from 'path';
import { ChildProcess, spawn } from 'child_process';
import { PassThrough } from 'stream';
import { M2Handler } from '../m2Handler';
import split2 = require('split2');

export interface IMainArguments {
	app: string;
	gdb: string;
	env: NodeJS.ProcessEnv;
	port: number;
}

const CHANNEL_TITLE = 'kendryte.gdb-run';
let channel: vscode.OutputChannel;
channel = vscode.window.createOutputChannel(CHANNEL_TITLE);

function createProcess(arg: IMainArguments): ChildProcess & { output: NodeJS.ReadableStream } {
	channel.appendLine(`spawn:`);
	channel.appendLine(`     gdb: ${arg.gdb} --interpreter=mi2`);
	channel.appendLine(`     app: ${arg.app}`);
	channel.appendLine(`    port: ${arg.port}`);
	channel.appendLine(`     env: ${JSON.stringify(arg.env, null, 8)}`);
	const process = spawn(arg.gdb, [arg.app, '--interpreter=mi2'], {
		cwd: resolve(arg.app, '..'),
		env: arg.env,
		stdio: 'pipe',
		shell: false,
		windowsHide: true,
	});
	channel.appendLine(`pid: ${process.pid}`);

	return Object.assign(process, {
		output: process.stdout.pipe(split2()),
	});
}

export function runWithoutDebug(debugChannel: ChannelLogger, arg: IMainArguments) {
	if (!channel) {
		channel = vscode.window.createOutputChannel(CHANNEL_TITLE);
	}
	channel.clear();

	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Starting program',
	}, async (report: vscode.Progress<{ message?: string; increment?: number }>, cancel) => {
		const process = createProcess(arg);

		process.stderr.pipe(split2()).on('data', (line: Buffer) => {
			channel.appendLine(line.toString('utf8').replace(/^/mg, ' ! '));
		});

		cancel.onCancellationRequested(() => {
			process.kill('SIGKILL');
		});

		const m2Handler = new M2Handler(process.output, process.stdin, channel);
		await m2Handler.command('gdb-set target-async off');
		await m2Handler.command(`target-select remote 127.0.0.1:${arg.port}`);
		await m2Handler.command(`exec-interrupt`);
		await m2Handler.command(`target-download`);
		await m2Handler.command(`exec-continue`);

		process.kill('SIGKILL');
	}).then(() => {
		channel.appendLine('[SUCCESS] runWithoutDebug: success.');
	}, (e) => {
		if (!e) {
			e = new Error('Unknown error');
		}
		channel.appendLine(`[ERROR] runWithoutDebug: failed with error: ${e}.`);
		throw e;
	});
}
