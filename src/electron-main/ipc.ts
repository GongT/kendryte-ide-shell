import { is } from 'electron-util';
import { EventEmitter } from 'events';
import { pathExists, unlink } from 'fs-extra';
import { createServer, Server, Socket } from 'net';
import { alwaysPromise } from '../library/alwaysPromise';
import { myProfilePath, posixPath } from '../library/environment';
import { registerCleanup, registerCleanupStream } from '../library/lifecycle';
import { streamPromise } from '../library/streamPromise';
import split2 =require('split2');

const defTimeout = is.windows? 30000 : 20000;

let _ipcPipe = posixPath(myProfilePath('ipc-pipe.sock'));
if (is.windows) {
	_ipcPipe = '\\\\?\\pipe\\' + _ipcPipe;
}
export const ipcPipe = _ipcPipe;

let pipe: Server;

export interface IProtocol {
	type: string;
	data: any;
}

export interface IpcHandler {
	(data: IProtocol): void
}

export interface IpcDataHandler {
	(data: any): void
}

async function untinueConnectWithId(id: string): Promise<Socket> {
	await ensureIpcServer();
	return new Promise<Socket>((resolve, reject) => {
		function resolver(socket: Socket) {
			pipe.removeListener('newConnection', resolver);
			const s = pool.get(id);
			if (s) {
				clearTimeout(to);
				resolve(socket);
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

class IpcChannel extends EventEmitter {
	private readonly stream: NodeJS.ReadableStream;
	private _closed: boolean = false;
	
	constructor(
		public readonly socket: Socket,
	) {
		super();
		this.stream = socket.pipe(split2(JSON.parse));
		this.stream.on('data', (data: IProtocol) => {
			if (this.listenerCount(data.type) > 0) {
				this.emit(data.type, data.data);
			} else {
				this.emit('any', data);
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
	
	waitMessage(type: string, timeout: number = defTimeout): Promise<any> {
		if (this._closed) {
			return Promise.reject(new Error('IPC Channel Broken'));
		}
		return new Promise((resolve, reject) => {
			const rejClose = () => {
				reject(new Error('IPC Channel Broken'));
			};
			const resolver = (data: any) => {
				this.removeListener('close', rejClose);
				if (to) {
					clearTimeout(to);
				}
				resolve(data);
			};
			
			const to = timeout? setTimeout(() => {
				this.removeListener('close', rejClose);
				this.removeListener(type, resolver);
				reject(new Error('Application no response'));
			}, timeout) : null;
			
			this.once(type, resolver);
			this.once('close', rejClose);
		});
	}
}

export async function createIpcChannel(id: string) {
	const socket = await untinueConnectWithId(id);
	return new IpcChannel(socket);
}

const pool = new Map<string, IpcChannel>();

export async function ensureIpcServer() {
	if (pipe) {
		return;
	}
	pipe = createServer((socket) => {
		const ch = new IpcChannel(socket);
		
		registerCleanupStream(socket);
		Promise.race([
			ch.waitMessage('any'),
			ch.waitMessage('hello'),
		]).then((id: string) => { // if any, `id` is object
			if (typeof id === 'string') {
				socket.pause();
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
	if (await pathExists(ipcPipe)) {
		console.log('unlink %s', ipcPipe);
		await unlink(ipcPipe);
	}
	
	await new Promise((resolve, reject) => {
		pipe.listen(ipcPipe, resolve);
		pipe.on('error', (e) => {
			reject(e);
		});
	});
}
