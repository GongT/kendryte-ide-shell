export interface ISourceType {
	id?: string;
	root: string;
	output: string;
	built?: string;
	sourceFiles: string[]|string;
	task: TaskProcessorConstructor;
	clean?: boolean;
}

export interface TaskProcessor {
	(p: NodeJS.ReadWriteStream): NodeJS.ReadWriteStream
}

export interface TaskProcessorConstructor {
	(e: ISourceType): TaskProcessor;
}

export function taskName(prefix: string, obj: ISourceType) {
	if (obj.id) {
		return prefix + ':' + obj.id;
	} else if (Array.isArray(obj.sourceFiles)) {
		return prefix + ':' + obj.sourceFiles.join('.');
	} else {
		return prefix + ':' + obj.sourceFiles;
	}
}

export function createGlob(src: string|string[]) {
	if (Array.isArray(src)) {
		const srcGlob = src.length > 1? '{' + src.join(',') + '}' : src[0];
		return '**/*.' + srcGlob;
	} else {
		return src;
	}
}
