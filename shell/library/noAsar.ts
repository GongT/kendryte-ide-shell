import { alwaysPromise } from './alwaysPromise';

export function noAsar<T>(action: () => Promise<T>): Promise<T> {
	process.noAsar = true;
	return alwaysPromise(action(), () => {
		process.noAsar = false;
	}, true);
}
