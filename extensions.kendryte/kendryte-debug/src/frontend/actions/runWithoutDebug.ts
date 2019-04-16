import * as vscode from 'vscode';
import { resolve } from 'path';
import { ChildProcess, spawn } from 'child_process';
import { PassThrough } from 'stream';
import { Mi2Handler } from '../../common/mi2/mi2Handler';
import { createChannel, FrontendChannelLogger } from '../lib/frontendChannelLogger';
import { LogLevel } from '../../common/baseLogger';
import { createGdbProcess, waitProcess } from '../../common/createGdbProcess';
import split2 = require('split2');

export interface IDebugWithoutRunArguments {
	app: string;
	gdb: string;
	env: NodeJS.ProcessEnv;
	port: number;
	logLevel: LogLevel;
}

const CHANNEL_TITLE = 'kendryte.gdb-run';

function createProcess(arg: IDebugWithoutRunArguments) {
	const logger = new FrontendChannelLogger('spawn', createChannel(CHANNEL_TITLE));
	logger.setLevel(arg.logLevel);
	return createGdbProcess({
		gdb: arg.gdb,
		app: arg.app,
		args: [],
		env: arg.env,
		logger: logger,
	});
}

export function runWithoutDebug(arg: IDebugWithoutRunArguments) {
	const channel = createChannel(CHANNEL_TITLE);
	channel.clear();

	const logger = new FrontendChannelLogger('run', channel);

	const p = Promise.resolve(vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: 'Starting program',
	}, async (report: vscode.Progress<{ message?: string; increment?: number }>, cancel) => {
		const process = createProcess(arg);
		const processToExit = waitProcess(process);

		process.stderr.pipe(split2()).on('data', (line: Buffer) => {
			logger.error(line.toString('utf8'));
		});

		cancel.onCancellationRequested(() => {
			process.kill('SIGKILL');
		});

		const output = new FrontendChannelLogger('mi2', channel);
		const m2Handler = new Mi2Handler(process.stdout, process.stdin, output);
		await m2Handler.command('gdb-set target-async on');
		await m2Handler.command(`target-select remote 127.0.0.1:${arg.port}`);
		await m2Handler.command('exec-interrupt');
		await m2Handler.command('target-download');
		await m2Handler.command('exec-continue');

		logger.info('success.');

		process.kill('SIGKILL');

		await processToExit.catch(() => {});

		logger.info('gdb process quit (killed).');
	}));

	p.catch((e) => {
		if (!e) {
			e = new Error('Unknown error');
		}
		logger.error('failed with error:', e);
	});

	return p;
}
