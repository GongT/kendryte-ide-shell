import { resolve } from 'path';
import { PassThrough } from 'stream';
import { RELEASE_ROOT, VSCODE_ROOT } from '../../environment';
import { getOutputCommand, pipeCommandOut } from '../../library/childprocess/complex';
import { ProgramError } from '../../library/childprocess/error';
import { log } from '../../library/gulp';
import { whatIsThis } from '../../library/misc/help';
import { runMain, useWriteFileStream } from '../../library/misc/myBuildSystem';
import { chdir } from '../../library/misc/pathUtil';
import { CollectingStream } from '../../library/misc/streamUtil';
import { timeout } from '../../library/misc/timeUtil';
import { gulpCommands } from '../codeblocks/gulp';

whatIsThis(
	'Format all source code and check errors.',
	'格式化所有源文件，并检查其中的错误',
);

const split2 = require('split2');

const fileNotFormat = /^File not formatted: (.+)$/;
const errReport = /^(src[\\/].+?)\(\d+,\d+\): /;
const violates = /^(src[\\/].+?):\d+:\d+:Imports violates/;
const isTs = /\.ts$/i;
const isCss = /\.css$/i;

runMain(async () => {
	process.stderr.write('\x1Bc\r');
	chdir(VSCODE_ROOT);
	
	log('running reformat on ALL source files, this will use about 1min. please wait.');
	log('waiting for \'yarn gulp hygiene\'');
	
	const notFormattedFiles: string[] = [];
	const notValidFiles: string[] = [];
	const processor = split2().on('data', (line: string) => {
		line = line.toString();
		
		if (fileNotFormat.test(line)) {
			notFormattedFiles.push(fileNotFormat.exec(line)[1].trim());
		} else if (errReport.test(line)) {
			notFormattedFiles.push(errReport.exec(line)[1].trim());
		} else if (violates.test(line)) {
			notValidFiles.push(violates.exec(line)[1].trim());
		}
	});
	
	const multiplex = new PassThrough();
	const collector = new CollectingStream();
	multiplex.pipe(processor);
	multiplex.pipe(collector);
	multiplex.pipe(useWriteFileStream(resolve(RELEASE_ROOT, 'hygiene.log')));
	
	await await pipeCommandOut(multiplex, 'node', ...gulpCommands(), 'hygiene').then(() => {
		log('gulp hygiene exit successful');
	}, (e: ProgramError) => {
		log(`gulp hygiene exit with failed status: ${e.status || ''}${e.signal || ''}`);
		notValidFiles.unshift('hygiene failed. this list may not complete. run yarn gulp hygiene too see full.');
	});
	
	if (notFormattedFiles.length) {
		log(`fixing ${notFormattedFiles.length} error....\n`);
		
		for (const file of notFormattedFiles) {
			log(file + '\n');
			if (isTs.test(file)) {
				await getOutputCommand('tsfmt', '-r', file).catch(() => {
					notValidFiles.push(file);
				});
			} else if (isCss.test(file)) {
				
				await getOutputCommand(
					'css-beautify',
					'-n', '-t', '-L', '-N', '--type', 'css', '-r', '-f', file).catch(() => {
					notValidFiles.push(file);
				});
			} else {
				notValidFiles.push(file);
			}
		}
	}
	
	if (notValidFiles.length) {
		log('\n\n');
		
		await timeout(500);
		
		console.error('\n' + collector.getOutput() + '\n');
		
		log(notValidFiles.length + ' files must fix by hand.');
		for (const file of notValidFiles) {
			console.error(' x %s', file);
		}
		console.log('\n\n');
		throw new Error('auto fix fail.');
	} else {
		log(notFormattedFiles.length + ' files auto fix complete.');
	}
	
	console.error('Notice: you must run `yarn gulp hygiene` again...');
});
