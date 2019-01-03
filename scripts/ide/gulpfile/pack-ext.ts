import { VSCODE_ROOT } from '../../environment';

const gulp = require('gulp');
const path = require('path');
const createAsar = require(VSCODE_ROOT + 'build/lib/asar').createAsar;
const _ = require('underscore');
const deps = require(VSCODE_ROOT + 'build/dependencies');
const filter = require('gulp-filter');
const vfs = require('vinyl-fs');

const root = process.env.PACK_TARGET;
console.log(`root=${root}`);
process.chdir(root);
const task = 'create-asar:' + path.basename(root);

const productionDependencies = deps.getProductionDependencies(root);
const depsSrc = [
	..._.flatten(productionDependencies.map((d: any) => path.relative(root, d.path))
	                                   .map((d: string) => [`${d}/**`, `!${d}/**/{test,tests}/**`])),
	// @ts-ignore JSON checking: dependencies is optional
];
gulp.task(task, () => {
	return gulp.src(depsSrc, {base: '.', dot: true})
	           .pipe(filter(['**', '!**/package-lock.json']))
	           .pipe(createAsar(path.join(root, 'node_modules'), [
		           '**/*.node',
		           '**/*.dll',
		           '**/*.exe',
		           '**/vscode-ripgrep/bin/*',
		           '**/node-pty/build/Release/*',
	           ], 'node_modules.asar'))
	           .pipe(vfs.dest(root + '/aa'));
});

gulp.task('default', [task]);