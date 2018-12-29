import { basename, join, relative, resolve } from 'path';
import { pipeCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { chdir } from '../../library/misc/pathUtil';
import { listExtension } from './list';
import { IExtensionPath } from './path';

export async function buildExtension({targetRoot, sourceRoot}: IExtensionPath, watch: boolean) {
	chdir(sourceRoot);
	log('build extensions: ');
	log('  From: ' + sourceRoot);
	log('    To: ' + targetRoot);
	log(' Watch: ' + (watch? 'True' : 'False'));
	
	const tscBin = 'tsc';
	
	const commands: string[][] = [];
	for (const extName of await listExtension()) {
		const targetDir = resolve(targetRoot, basename(extName));
		const tsconfigFile = join(extName, 'tsconfig.json');
		
		const args = [
			'-p',
			tsconfigFile,
			'--outDir',
			relative(sourceRoot, targetDir),
		];
		if (watch) {
			args.push('-w');
		}
		commands.push(args);
	}
	
	await Promise.race(commands.map(async (args) => {
		return pipeCommandOut(process.stderr, tscBin, ...args);
	}));
}
