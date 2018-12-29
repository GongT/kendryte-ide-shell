export function streamPromise(stream: NodeJS.WritableStream): Promise<NodeJS.WritableStream>;
export function streamPromise(stream: NodeJS.ReadableStream): Promise<NodeJS.ReadableStream>;
export function streamPromise(stream: NodeJS.ReadWriteStream): Promise<NodeJS.ReadWriteStream>;
export function streamPromise(stream: NodeJS.ReadableStream|NodeJS.WritableStream): Promise<NodeJS.ReadableStream|NodeJS.WritableStream> {
	if (streamHasEnd(stream)) {
		return Promise.resolve(stream);
	} else {
		return new Promise((resolve, reject) => {
			stream.once('end', () => {
				resolve(stream);
			});
			stream.once('finish', () => {
				resolve(stream);
			});
			stream.once('close', () => {
				resolve(stream);
			});
			stream.once('error', reject);
		});
	}
}

export function streamHasEnd(S: NodeJS.ReadableStream|NodeJS.WritableStream) {
	const stream = S as any;
	return (stream._writableState && stream._writableState.ended) || (stream._readableState && stream._readableState.ended);
}
