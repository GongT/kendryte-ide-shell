export function timeout(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});
}
export function timing() {
	const date = new Date;
	
	return function () {
		const t = (Date.now() - date.getTime()) / 1000;
		return ` (in ${t.toFixed(2)} sec)`;
	};
}
