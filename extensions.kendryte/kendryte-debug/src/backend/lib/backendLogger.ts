import { DebugSession, Event } from 'vscode-debugadapter';
import { LogLevel, NodeLoggerCommon } from '../../common/baseLogger';
import { ILogEventBody } from '../../common/eventProtocol';

export class CustomEvent<T = any> extends Event {
	constructor(type: string, event: T) {
		super('custom', {
			type,
			event,
		});
	}
}

export class BackendLogger extends NodeLoggerCommon {
	constructor(
		tag: string,
		private readonly session: DebugSession,
	) {
		super(tag);
	}

	public printLine(tag: string, level: LogLevel, message: string) {
		this.session.sendEvent(
			new CustomEvent<ILogEventBody>('log', {
				level: level,
				message: `${tag}: ${message.replace(/^/g, '  ').trim()}`,
			}),
		);
	}

	public clear(): void {
		this.session.sendEvent(
			new CustomEvent<void>('clear-log', undefined),
		);
	}
}
