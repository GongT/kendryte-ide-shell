export function alwaysPromise<T>(p: Promise<T>, always: (error: Error, data?: T) => void, pass: true): Promise<T>
export function alwaysPromise<T>(p: Promise<T>, always: (error: Error, data?: T) => void, pass?: false): void
export function alwaysPromise<T>(p: Promise<T>, always: (error: Error, data?: T) => void, pass: boolean = false): Promise<T>|void {
	return pass? p.then((d: T) => {
		always(null, d);
		if (pass) {
			return d;
		}
		return void 0;
	}, (e) => {
		always(e);
		if (pass) {
			throw e;
		}
		return void 0;
	}) : void 0;
}
