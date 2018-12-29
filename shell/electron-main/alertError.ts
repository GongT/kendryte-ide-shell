export function alertError(e: Error) {
	console.error(e.stack);
	alert('Error while starting IDE:\n' + e.message + '\nPlease contact us to resolve.');
}
