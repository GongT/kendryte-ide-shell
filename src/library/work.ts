import { logger } from './logger';

export type IWorkFn = () => Promise<any>|void;
const work: IWorkFn[] = [];

export function registerWork(cb: IWorkFn) {
	work.push(cb);
}

export function getWorkCount() {
	return work.length;
}

export async function doActualWork() {
	for (const cb of work) {
		await cb();
	}
	work.length = 0;
}

export function workTitle(action: string, sub: string): IWorkFn {
	return () => {
		logger.action(action, sub);
	};
}