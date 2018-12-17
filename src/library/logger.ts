import { is } from 'electron-util';
import { createWriteStream, ensureDir, ftruncate, open } from 'fs-extra';
import { contentRoot, configFile, isBuilt, myProfilePath, nativePath } from './environment';
import { registerCleanup } from './lifecycle';

const CLS_INFINITY = 'infinite';
const CLS_HIDE = 'hide';

export interface ILogger {
	debug(message: string): void;
	log(message: string): void;
	error(message: string): void;
	action(message: string, subMessage?: string): void;
	sub1(message: string): void;
	sub2(message: string): void;
	progress(percent: number): void;
	readonly currentAction: string;
}

class Logger implements ILogger {
	private readonly $progressInner: HTMLDivElement;
	private readonly isInfinity = stateStore(this.$progress, CLS_INFINITY, false);
	private readonly isNaN = stateStore(this.$progress, CLS_HIDE, true);
	
	constructor(
		private readonly _output: NodeJS.WritableStream,
		private readonly $action: HTMLDivElement,
		private readonly $doing1: HTMLDivElement,
		private readonly $doing2: HTMLDivElement,
		private readonly $progress: HTMLDivElement,
		private readonly $log: HTMLDivElement,
	) {
		this.$progressInner = $progress.querySelector('.inner');
	}
	
	public get currentAction() {
		return this.$action.innerHTML;
	}
	
	public action(message: string, subMessage: string = ''): void {
		this.$action.innerHTML = message;
		this._writeln(message, 'action');
		
		this.$doing1.innerHTML = subMessage;
		this.$doing2.innerHTML = '';
		if (subMessage) {
			this._writeln(subMessage, 'action-sub');
		}
	}
	
	public sub1(message: string): void {
		this.$doing1.innerHTML = message;
	}
	
	public sub2(message: string): void {
		this.$doing2.innerHTML = message;
	}
	
	public progress(percent: number): void {
		if (this.isNaN(isNaN(percent))) {
			return;
		}
		if (this.isInfinity(percent === Infinity)) {
			return;
		}
		
		this.$progressInner.style.width = percent.toFixed(2) + '%';
	}
	
	public debug(message: string): void {
		this._writeln(message, 'log debug');
	}
	
	public log(message: string): void {
		this._writeln(message, 'log');
		this.sub2(message);
	}
	
	public error(message: string): void {
		this._writeln(message, 'error');
		this.sub2(message);
	}
	
	private _writeln(message: string, cls: string = '') {
		const line = document.createElement('div');
		if (cls) {
			line.className = cls;
		}
		line.innerHTML = message;
		this.$log.append(line);
		this._output.write(message + '\n');
	}
}

function stateStore($progress: HTMLDivElement, className: string, lastState: boolean) {
	return (test: boolean) => {
		if (test) {
			if (lastState) {
				return true;
			}
			lastState = true;
			$progress.classList.add(className);
			return true;
		} else if (lastState) {
			lastState = false;
			$progress.classList.remove(className);
		}
		return false;
	};
}

if (is.main) {
	throw new Error('something require logger in main.');
}

export async function createLogger(
	$action: HTMLDivElement,
	$doing1: HTMLDivElement,
	$doing2: HTMLDivElement,
	$progress: HTMLDivElement,
	$log: HTMLDivElement,
) {
	const path = myProfilePath('logs/kupdater.log');
	await ensureDir(nativePath(path, '..'));
	const fd = await open(path, 'w');
	await ftruncate(fd);
	const stream = createWriteStream(path, {fd, encoding: 'utf8', autoClose: true, start: 0});
	
	logger = new Logger(
		stream,
		$action,
		$doing1,
		$doing2,
		$progress,
		$log,
	);
	
	logger.debug(`isBuilt=${isBuilt}`);
	logger.debug(`appRoot=${contentRoot}`);
	logger.debug(`configFile=${configFile}`);
	
	registerCleanup(() => {
		logger = null;
		return new Promise<void>((resolve, reject) => {
			const wrappedCallback = (err: Error) => err? reject(err) : resolve();
			stream.end(wrappedCallback);
		});
	});
}

export let logger: ILogger;


