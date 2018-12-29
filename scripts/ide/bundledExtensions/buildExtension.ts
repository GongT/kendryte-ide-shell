import { basename, join, relative, resolve } from 'path';
import { pipeCommandOut } from '../../library/childprocess/complex';
import { chdir } from '../../library/misc/pathUtil';
import { listExtension } from './list';
import { IExtensionPath } from './path';

export async function buildExtension(output: NodeJS.WritableStream, {targetRoot, sourceRoot}: IExtensionPath, watch: boolean) {
	chdir(sourceRoot);
	output.write('build extensions: \n');
	output.write('  From: ' + sourceRoot + '\n');
	output.write('    To: ' + targetRoot + '\n');
	output.write(' Watch: ' + (watch? 'True' : 'False') + '\n');
	
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
		return pipeCommandOut(output, tscBin, ...args);
	}));
}
