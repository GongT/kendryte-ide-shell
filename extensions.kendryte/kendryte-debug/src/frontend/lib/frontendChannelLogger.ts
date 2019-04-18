import * as vscode from 'vscode';
import { LogLevel, LogLevelNames, NodeLoggerCommon } from '../../common/baseLogger';

let globalChannel: vscode.OutputChannel;
let otherChannels = new Map<string, vscode.OutputChannel>();

export function globalLogChannelSingleton() {
	if (!globalChannel) {
		globalChannel = vscode.window.createOutputChannel('kendryte.gdb');
	}
	return globalChannel;
}

export function disposeChannel() {
	globalChannel.appendLine('will dispose');
	globalChannel.dispose();
	otherChannels.forEach((item) => {
		item.appendLine('will dispose');
		item.dispose();
	});
}

export function createChannel(name: string): vscode.OutputChannel {
	if (!otherChannels.has(name)) {
		globalLogChannelSingleton().appendLine('create channel: ' + name);
		otherChannels.set(name, vscode.window.createOutputChannel(name));
	}
	return otherChannels.get(name);
}

export class FrontendChannelLogger extends NodeLoggerCommon {
	private currentLevel: LogLevel;

	constructor(
		tag: string,
		private readonly channel: vscode.OutputChannel = globalLogChannelSingleton(),
	) {
		super(tag);
		this.setLevel(LogLevel.Info);
	}

	public setLevel(logLevel: LogLevel) {
		this.currentLevel = logLevel;
	}

	clear() {
		this.channel.clear();
	}

	protected printLine(tag: string, level: LogLevel, message: string) {
		if (this.currentLevel === LogLevel.Off || this.currentLevel > level) {
			return;
		}
		if (message === '') {
			this.channel.appendLine('');
			return;
		}

		if (typeof message !== 'string') {
			message = '' + message;
		}

		const levelName = LogLevelNames[level];
		const fullTag = levelName ? `${tag}][${levelName}` : tag;
		this.channel.appendLine(this.prependTags(fullTag, message));
	}
}


