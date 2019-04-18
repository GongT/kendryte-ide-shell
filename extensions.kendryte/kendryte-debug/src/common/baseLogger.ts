import { format } from 'util';

export enum LogLevel {
	Trace,
	Debug,
	Info,
	Warning,
	Error,
	Critical,
	Off
}

export const LogLevelNames = {
	[LogLevel.Trace]: 'TRACE',
	[LogLevel.Debug]: 'DEBUG',
	[LogLevel.Info]: ' INFO',
	[LogLevel.Warning]: ' WARN',
	[LogLevel.Error]: 'ERR',
	[LogLevel.Critical]: 'FATAL',
};

export interface IMyLogger {
	writeln(data: string, ...args: any[]);

	trace(msg: string, ...args: any[]);
	debug(msg: string, ...args: any[]);
	info(msg: string, ...args: any[]);
	warning(msg: string, ...args: any[]);
	error(msg: string, ...args: any[]);
	critical(msg: string, ...args: any[]);
}

export abstract class NodeLoggerCommon implements IMyLogger {
	protected constructor(private readonly _tag: string) {
	}

	abstract clear(): void;

	protected abstract printLine(tag: string, level: LogLevel, message: string);

	protected prependTags(tag: string, message: string) {
		return message.replace(/^/g, `[${tag}] `).trim();
	}

	writeln(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Off, msg);
	}

	trace(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Trace, msg);
	}

	debug(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Debug, msg);
	}

	info(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Info, msg);
	}

	warning(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Warning, msg);
	}

	error(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Error, msg);
	}

	critical(msg: string, ...args: any[]) {
		if (args.length) {
			msg = format(msg, ...args);
		}
		this.printLine(this._tag, LogLevel.Critical, msg);
		throw new Error(msg);
	}
}
