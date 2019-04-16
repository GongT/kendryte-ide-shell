import { EventEmitter } from 'events';

export interface EventCallback<T> {
	(data: T): void
}

export interface EventRegister<T> {
	(cb: EventCallback<T>): void
}

export class Emitter<T> {
	private nodeEvent = new EventEmitter();

	fire(data: T) {
		this.nodeEvent.emit('rawEvent', data);
	}

	get event(): EventRegister<T> {
		return (cb: EventCallback<T>) => {
			this.nodeEvent.on('rawEvent', cb);
		};
	}

	dispose() {
		this.nodeEvent.removeAllListeners('rawEvent');
		delete this.nodeEvent;
	}
}