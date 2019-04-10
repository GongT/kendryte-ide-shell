export function pad(num: number) {
	if (num > 9) {
		return num.toFixed(0);
	} else {
		return '0' + num.toFixed(0);
	}
}

export function cmp_string(s1: string, s2: string) {
	if (s1 === s2) {
		return 0;
	}
	if (s1 > s2) {
		return 1;
	}
	return -1;
}
