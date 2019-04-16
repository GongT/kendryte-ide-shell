import { Response } from 'vscode-debugadapter';

const responseSymbol = Symbol('alreadyResponse');

export function handleMethodPromise(code?: number, actionTitle?: string): MethodDecorator {
	return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
		actionTitle = actionTitle || `GDB: cannot ${propertyKey.toString()}: {message}`;
		if (typeof descriptor.value === 'function') {
			const original: Function = descriptor.value;
			descriptor.value = function (response: Response, ...others: any[]) {
				this.vscodeProtocolLogger.info(`::%s()`, propertyKey);

				return Promise.resolve(original.apply(this, arguments)).then(() => {
					if (response[responseSymbol]) {
						response[responseSymbol].push(propertyKey);
						this.vscodeProtocolLogger.info(`::%s() duplicate resolve, stack = %s`, propertyKey, response[responseSymbol]);
					} else {
						this.vscodeProtocolLogger.info(`::%s() resolved`, propertyKey);
						response[responseSymbol] = [propertyKey];
						this.sendResponse(response);
					}
				}, (e) => {
					if (!(e instanceof Error)) {
						const msg = e ? e.message || 'NoMessage' : 'NoMessage';
						e = new Error('Unknown reason: ' + msg);
					}

					this.vscodeProtocolLogger.info(`::%s() rejected: %s`, propertyKey, e);
					code = (e instanceof ErrorCode) ? e.code : 233;
					this.sendErrorResponse(response, code, actionTitle, {
						message: e.message,
						code,
						stack: e.stack,
					});
				});
			};
			return descriptor;
		} else {
			throw new Error('Cannot decorate ' + propertyKey.toString());
		}
	};
}

export class ErrorCode extends Error {
	constructor(public readonly code: number, message: string) {
		super(message);
	}
}