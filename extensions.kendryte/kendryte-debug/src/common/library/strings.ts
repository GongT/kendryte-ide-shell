export function padPercent(n: number) {
	const s = n.toFixed(0);
	if (s.length === 3) {
		return s + '%';
	} else if (s.length === 2) {
		return ' ' + s + '%';
	} else if (s.length === 1) {
		return '  ' + s + '%';
	}
	return 'NaN';
}

export function errorMessage(e: Error) {
	return e ? e.message || e || 'UnknownError' : 'UnknownError';
}

export function dumpJson(a: any) {
	return `\n--------------------------------\n${JSON.stringify(a, null, 4)}\n--------------------------------`;
}
