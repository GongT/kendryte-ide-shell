import { log, sourcemaps, typescript } from '../gulp';
import { resolvePath } from '../misc/pathUtil';
import { ISourceType, TaskProcessor } from './sourceType';

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
