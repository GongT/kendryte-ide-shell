import { is } from 'electron-util';
import { createWriteStream, ensureDir, ftruncate, open } from 'fs-extra';
import { configFile, contentRoot, isBuilt, myProfilePath, nativePath, SELF_VERSION } from './environment';
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

let cc: string,
	cvDebug: string,
	cvLog: string,
	cvError: string;

if (typeof window === 'undefined') {
	cc = 's';
	cvDebug = '\x1B[38;5;244m';
	cvLog = '\x1B[38;5;0m';
	cvError = '\x1B[38;5;9m';
} else {
	cc = 'c';
	cvDebug = 'color:grey';
	cvLog = 'color:black';
	cvError = 'color:red';
}

class ConsoleLogger implements ILogger {
	private _currentAction: string;
	
	get currentAction(): string {
		return this._currentAction;
	}
	
	public debug(message: string): void {
		console.log(`%${cc}[DEBUG] ${message}`, cvDebug);
	}
	
	public log(message: string): void {
		console.log(`${cc}[  LOG] ${message}`, cvLog);
	}
	
	public error(message: string): void {
		console.log(`${cc}[ERROR] ${message}`, cvError);
	}
	
	public action(message: string, subMessage?: string): void {
		this._currentAction = message;
		this.sub1(subMessage);
	}
	
	public sub1(message: string): void {
		console.log(`${cc}[ERROR] ${message}`, cvError);
	}
	
	public sub2(message: string): void {
		console.log(`${cc}[ERROR] ${message}`, cvError);
	}
	
	public progress(percent: number): void {
		process.stdout.write(`Progress: ${percent}%\r`);
	}
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
		console.log('Action: ' + message);
		console.log('        ' + subMessage);
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
		console.log('debug: ' + message);
		this._writeln(message, 'log debug');
	}
	
	public log(message: string): void {
		console.log('log: ' + message);
		this._writeln(message, 'log');
		this.sub2(message);
	}
	
	public error(message: string): void {
		console.error('error: ' + message);
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
	
	logger.debug(`SELF_VERSION=${SELF_VERSION}`);
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

export let logger: ILogger = new ConsoleLogger();


