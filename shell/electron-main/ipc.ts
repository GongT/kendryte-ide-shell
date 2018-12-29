import { is } from 'electron-util';
import { EventEmitter } from 'events';
import { createServer, Server, Socket } from 'net';
import { alwaysPromise } from '../library/alwaysPromise';
import { registerCleanup, registerCleanupStream } from '../library/lifecycle';
import { streamPromise } from '../library/streamPromise';
import split2 =require('split2');

const defTimeout = is.windows? 30000 : 20000;

export const ipcPipe = '127.0.0.1:' + (50000 * Math.random() + 10000).toFixed(0);

let pipe: Server;

export interface IProtocol {
	type: string;
	data: any;
	token: number;
}

export interface IpcHandler {
	(data: IProtocol): void
}

export interface IpcDataHandler {
	(data: any): void
}

async function untilConnectWithId(id: string): Promise<IpcChannel> {
	await ensureIpcServer();
	return new Promise<IpcChannel>((resolve, reject) => {
		function resolver(socket: Socket) {
			pipe.removeListener('newConnection', resolver);
			const s = pool.get(id);
			if (s) {
				clearTimeout(to);
				resolve(s);
			}
		}
		
		const to = setTimeout(() => {
			pipe.removeListener('newConnection', resolver);
			reject(new Error('Application no response'));
		}, defTimeout);
		
		pipe.on('newConnection', resolver);
	});
}

export function closeIpcChannel(id: string) {
	if (pool.has(id)) {
		try {
			pool.get(id).close();
		} catch (e) {
		}
	}
}

interface IResolver {
	resolve(data: any): void;
	reject(err: Error): void;
}

class IpcChannel extends EventEmitter {
	private readonly stream: NodeJS.ReadableStream;
	private _closed: boolean = false;
	private readonly waitResponse = new Map<number, IResolver>();
	
	constructor(
		public readonly socket: Socket,
	) {
		super();
		this.stream = socket.pipe(split2(JSON.parse));
		this.stream.on('data', (line: IProtocol) => {
			console.log('[Update IPC Server] recv', line);
			if (line.type === 'response') {
				this.handleResponse(line.data, line.token);
			} else {
				try {
					const response = (data: any) => {
						if (data instanceof Error) {
							data = {
								error: 1,
								message: data.message,
								stack: data.stack,
								name: data.name,
							};
						}
						this.send('response', data, line.token);
					};
					if (this.listenerCount(line.type) > 0) {
						this.emit(line.type, line.data, response);
					} else {
						this.emit('any', line);
						response(undefined);
					}
				} catch (e) {
					console.error('In %s handler: ', e.type, e.stack);
				}
			}
		});
		alwaysPromise(streamPromise(socket), () => {
			this.removeAllListeners();
			this.emit('close');
			this._closed = true;
		});
	}
	
	get closed() {
		return this._closed;
	}
	
	close() {
		this.socket.end();
	}
	
	waitMessage(type: string, data: any, timeout: number = defTimeout): Promise<any> {
		let to: NodeJS.Timer;
		let ps: Promise<void>[] = [];
		if (timeout) {
			ps.push(new Promise((resolve, reject) => {
				to = setTimeout(() => {
					reject(new Error('Application no response'));
				}, timeout);
			}));
		}
		ps.push(this.send(type, data, Date.now()));
		console.log('[Update IPC Server] waitting for %s response.', type);
		
		return alwaysPromise(Promise.race(ps), (err, data) => {
			if (err) {
				console.error('[Update IPC Server] not response for %s in %s.', type, timeout);
			} else {
				console.log('[Update IPC Server] see %s response:', type, data);
			}
			if (to) {
				clearTimeout(to);
			}
		}, true);
	}
	
	private handleResponse(data: any, token: number) {
		const cb = this.waitResponse.get(token);
		if (cb) {
			try {
				if (data && data.error) {
					const e = new Error(data.message);
					e.stack = data.stack;
					e.name = data.name;
					cb.reject(e);
				} else {
					cb.resolve(data);
				}
			} catch (e) {
				console.error('response fail', e);
			}
		} else {
			console.error('response not expect:', token, data);
		}
	}
	
	send(type: string, data: any, token = this.nextToken()) {
		if (this._closed) {
			return Promise.reject(new Error('IPC Channel Broken'));
		}
		console.log('[Update IPC Server] send', {type, data, token});
		this.socket.write(JSON.stringify({type, data, token}) + '\n');
		return new Promise<any>((resolve, reject) => {
			this.waitResponse.set(token, {resolve, reject});
		});
	}
	
	private token: number = 0;
	
	private nextToken() {
		this.token++;
		return this.token;
	}
}

export async function send(id: string, type: string, data: any) {
	pool.get(id).send(type, data);
	
}

export function createIpcChannel(id: string) {
	return untilConnectWithId(id);
}

const pool = new Map<string, IpcChannel>();

export async function ensureIpcServer() {
	if (pipe) {
		return;
	}
	pipe = createServer((socket) => {
		const ch = new IpcChannel(socket);
		
		registerCleanupStream(socket);
		ch.waitMessage('hello', '').then((id: string) => { // if any, `id` is object
			if (typeof id === 'string') {
				pool.set(id, ch);
				alwaysPromise(streamPromise(socket), () => {
					pool.delete(id);
				});
				pipe.emit('newConnection');
			} else {
				socket.end();
			}
		});
	});
	registerCleanup(() => {
		return new Promise((resolve) => {
			pipe.close((e: Error) => {
				if (e) {
					console.error('ignore error close server:', e.message);
				}
				resolve();
			});
		});
	});
	
	registerCleanup(async () => {
		await new Promise((resolve, reject) => {
			pipe.close(resolve);
		});
	}, 'ipcServer');
	
	await new Promise((resolve, reject) => {
		console.warn('\x1B[38;5;14mtry listening socket: %s\x1B[0m', ipcPipe);
		pipe.on('error', function (e: NodeJS.ErrnoException) {
			console.warn('\x1B[38;5;14m  --> %s\x1B[0m', e.code);
			reject(e);
		});
		
		pipe.listen(ipcPipe, () => {
			resolve();
		});
	});
}
