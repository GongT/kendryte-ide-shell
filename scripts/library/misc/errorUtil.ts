export function assert(condition: boolean, message: string) {
	if (condition) {
		return;
	}
	
	throw new Error('Assertion failed: ' + message);
}
