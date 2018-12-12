const list: Function[] = [];

export function registerCleanup(dispose: () => Promise<any> | void) {
	list.push(dispose);
}

export async function doCleanup() {
	console.info('doCleanup');
	for (const cb of list) {
		await cb();
	}
}