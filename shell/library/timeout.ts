export function timeout(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}

export function timeoutReject(ms: number): Promise<never>&{cancel(): void} {
	let to: NodeJS.Timer;
	return Object.assign(new Promise<never>((resolve, reject) => {
		to = setTimeout(() => {
			to = null;
			reject(new Error('Timeout'));
		}, ms);
	}), {
		cancel() {
			if (to) {
				clearTimeout(to);
			}
		},
	});
}

export function timing() {
	const date = new Date;
	
	return function () {
		const t = (Date.now() - date.getTime()) / 1000;
		return ` (in ${t.toFixed(2)} sec)`;
	};
}
