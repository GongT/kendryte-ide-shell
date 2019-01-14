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
	case 'sourcecode':
		channel = 'sourcecode';
		break;
	default:
		console.error('\x1B[38;5;9mPlease set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)\x1B[0m');
		console.trace();
		process.exit(1);
	}
	return channel;
}
