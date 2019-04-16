export function timeout(ms: number): [Promise<void>, () => void] {
	let cb: () => void;
	const p = new Promise<void>((resolve, reject) => {
		const to = setTimeout(() => resolve(), ms);
		cb = () => {
			clearTimeout(to);
			reject(new Error('cancel'));
		};
	});
	return [p, cb];
}

export interface ProgressPromise<T, NT> extends Promise<T> {
	progress(cb: NotifyCallback<NT>): this;
}

export class DeferredPromise<T, NT = void> {
	public readonly p: ProgressPromise<T, NT>;
	private completeCallback: ValueCallback<T>;
	private errorCallback: (err: any) => void;
	private notifyCallbacks: NotifyCallback<NT>[] = [];
	private _isComplete: boolean;
	private _isError: boolean;

	constructor() {
		this.p = Object.assign(new Promise<any>((c, e) => {
			this.completeCallback = (d) => {
				this._isComplete = true;
				c(d);
			};
			this.errorCallback = (err) => {
				this._isError = true;
				e(err);
			};
		}), {
			progress: (cb: NotifyCallback<NT>) => {
				this.notifyCallbacks.push(cb);
				return this.p;
			},
		});
	}

	public complete(value: T) {
		process.nextTick(() => {
			this.completeCallback(value);
		});
	}

	public error(err: any) {
		process.nextTick(() => {
			this.errorCallback(err);
		});
	}

	public cancel() {
		process.nextTick(() => {
			this.errorCallback(canceled());
		});
	}

	public notify(data: NT) {
		for (const cb of this.notifyCallbacks) {
			cb(data);
		}
	}

	public wrap<ST extends T>(source: Promise<ST>): Promise<ST> {
		return source.then((data: ST) => {
			this.complete(data);
			return data;
		}, (e) => {
			this.error(e);
			throw e;
		});
	}

	public isFired() {
		return this._isComplete || this._isError;
	}
}

export type ValueCallback<T> = (value: T | Thenable<T>) => void;
export type NotifyCallback<T> = (value: T) => void;

const canceledName = 'Canceled';

/**
 * Returns an error that signals cancellation.
 */
function canceled(): Error {
	const error = new Error(canceledName);
	error.name = error.message;
	return error;
}
