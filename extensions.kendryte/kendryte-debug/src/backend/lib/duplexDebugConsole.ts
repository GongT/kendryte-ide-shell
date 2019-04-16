import { IMyLogger } from '../../common/baseLogger';
import { DebugSession, OutputEvent } from 'vscode-debugadapter';

export interface IDebugConsole {
	_log(message: string): void;
	log(message: string): void;
	_error(message: string): void;
	error(message: string): void;
}

export function wrapDebugConsole(session: DebugSession, logger: IMyLogger): IDebugConsole {
	return {
		log(message: string) {
			session.sendEvent(new OutputEvent(message, 'stdout'));
			logger.info(message);
		},
		_log(message: string) {
			session.sendEvent(new OutputEvent(message, 'stdout'));
		},
		error(message: string) {
			session.sendEvent(new OutputEvent(message, 'stderr'));
			logger.error(message);
		},
		_error(message: string) {
			session.sendEvent(new OutputEvent(message, 'stderr'));
		},
	};
}