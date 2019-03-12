import { join, normalize } from 'path';
import { log, sourcemaps, typescript } from '../gulp';
import { resolvePath } from '../misc/pathUtil';
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
		log('    to %s', taskConfig.output);
		return p.pipe(sourcemaps.init({includeContent: true}))
		        .pipe(tsProject())
		        .pipe(sourcemaps.write(''))
		        .pipe(simpleTransformStream((file) => {
			        const distSrc = normalize(join(taskConfig.output, 'src'));
			        file.dirname = file.dirname.replace(distSrc, taskConfig.output);
			        return file;
		        }));
	};
}
