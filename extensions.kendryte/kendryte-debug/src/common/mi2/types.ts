export interface Breakpoint {
	bkptNum?: number;
	file?: string;
	line?: number;
	raw?: string;
	condition: string;
	countCondition?: string;
}

export interface Thread {
	id: number;
	targetId: string;
	name?: string;
}

export interface Stack {
	level: number;
	address: string;
	function: string;
	fileName: string;
	file: string;
	line: number;
}

export interface Variable {
	name: string;
	valueStr: string;
	type: string;
	raw?: any;
}
