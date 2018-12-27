import { EventEmitter } from 'events';

export function promiseToBool(p: Promise<any>): Promise<any> {
	return p.then(() => true, () => false);
}

export interface IResolver<T, NT> {
	(resolve: (data?: T) => void, reject: (error: Error) => void, notify: (data?: NT) => void): void;
}

export class ProgressPromise<T, NT> extends Promise<T> {
	private readonly event: EventEmitter;
	
	constructor(callback: IResolver<T, NT>) {
		super((resolve, reject) => {
			callback((data) => {
				this.event.emit('complete');
				resolve(data);
			}, (error) => {
				this.event.emit('complete');
				reject(error);
			}, (progress) => {
				this.event.emit('progress', progress);
			});
		});
		this.event = new EventEmitter();
		this.on('complete', () => {
			this.event.removeAllListeners();
		});
	}
	
	on(event: 'complete', cb: () => void): void;
	on(event: 'progress', cb: (progress: NT) => void): void;
	on(event: 'progress'|'complete', cb: (...args: any[]) => void): void {
		this.event.on(event, cb);
	}
	
	off(event: 'complete', cb?: () => void): void;
	off(event: 'progress', cb?: (progress: NT) => void): void;
	off(event: 'progress'|'complete', cb?: (...args: any[]) => void): void {
		this.event.removeListener(event, cb);
	}
}

