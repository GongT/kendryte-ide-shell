import { log, sourcemaps, typescript } from '../gulp';
import { posixJoin, resolvePath } from '../misc/pathUtil';
import { ISourceType, TaskProcessor } from './sourceType';
import { simpleTransformStream } from './transform';

export function createTypescriptTask(taskConfig: ISourceType): TaskProcessor {
	const tsProject = typescript.createProject(resolvePath(taskConfig.root, 'tsconfig.json'), {
		declaration: false,
		rootDir: '.',
	});
	return (p: NodeJS.ReadWriteStream) => {
		log('Compile typescript from %s', taskConfig.root);
		return p.pipe(sourcemaps.init({includeContent: true}))
		        .pipe(tsProject())
		        .pipe(sourcemaps.write(''));
	};
}

export function createTypescriptTaskWithRename(taskConfig: ISourceType): TaskProcessor {
	const tsProject = typescript.createProject(resolvePath(taskConfig.root, 'tsconfig.json'), {
		declaration: false,
		rootDir: '.',
	});
	return (p: NodeJS.ReadWriteStream) => {
		log('Compile typescript from %s (with rename)', taskConfig.root);
		return p.pipe(sourcemaps.init({includeContent: true}))
		        .pipe(tsProject())
		        .pipe(sourcemaps.write(''))
		        .pipe(simpleTransformStream((file) => {
			        const distSrc = posixJoin(file.base, 'src');
			        log(1, file.dirname);
			        file.dirname = file.dirname.replace(distSrc, file.base);
			        log(2, file.dirname);
			        return file;
		        }));
	};
}
