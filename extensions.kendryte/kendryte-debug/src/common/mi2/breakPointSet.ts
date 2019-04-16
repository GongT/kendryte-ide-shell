import { Breakpoint } from './types';

export class BreakPointSet {
	private breakpoints = new Map<string, Breakpoint>();

	get(b: Breakpoint): Breakpoint | void {
		const id = b.raw || `${b.file}:${b.line}`;
		if (this.breakpoints.has(id)) {
			return this.breakpoints.get(id);
		}
	}

	add(b: Breakpoint) {
		const id = b.raw || `${b.file}:${b.line}`;
		this.breakpoints.set(id, b);
	}

	remove(b: Breakpoint) {
		const id = b.raw || `${b.file}:${b.line}`;
		this.breakpoints.delete(id);
	}

	public clearAll() {
		this.breakpoints.clear();
	}
}