import { logger } from './logger';

export type IWorkFn = () => Promise<any>|void;

export interface IWorkObj {
	work: IWorkFn;
	hint: string;
}

const workList: IWorkObj[] = [];

export function registerWork(cb: IWorkFn, hint: string = 'no name') {
	workList.push({
		work: cb,
		hint,
	});
}

export function getWorkCount() {
	return workList.length;
}

export async function doActualWork() {
	for (const {work, hint} of workList) {
		const time = Date.now();
		if (hint) {
			logger.debug(`<div class="work-start">work ${hint}:</div>`);
		}
		
		await work();
		
		if (hint) {
			const delta = ((Date.now() - time) / 1000).toFixed(2);
			logger.debug(`<div class="work-end">work ${hint} has done in ${delta}s</div>`);
		}
	}
	workList.length = 0;
}

export function workTitle(action: string, sub: string) {
	workList.push({
		work() {
			logger.action(action, sub);
		},
		hint: '',
	});
}