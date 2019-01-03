export function getReleaseChannel() {
	let channel = '' + process.env.CHANNEL;
	switch (channel) {
	case 'a':
	case 'alpha':
		channel = 'alpha';
		break;
	case 'b':
	case 'beta':
		channel = 'beta';
		break;
	case 's':
	case 'stable':
		channel = 'stable';
		break;
	default:
		console.trace('\x1B[38;5;9mPlease set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)\x1B[0m');
		process.exit(1);
	}
	return channel;
}
