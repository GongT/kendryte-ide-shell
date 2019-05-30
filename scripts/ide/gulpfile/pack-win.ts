import { VSCODE_ROOT } from '../../environment';
import { yarnPackageDir } from '../../library/misc/pathUtil';

const gulp = require('gulp');
const path = require('path');
const createAsar = require(VSCODE_ROOT + '/build/lib/asar').createAsar;
const _ = require('underscore');
const deps = require(VSCODE_ROOT + '/build/dependencies');
const filter = require('gulp-filter');
const vfs = require('vinyl-fs');

const modulesRoot = yarnPackageDir('dependencies');
console.log('chdir(%s)', modulesRoot);
process.chdir(modulesRoot);
const root = process.cwd();

const productionDependencies = deps.getProductionDependencies(root);
const depsSrc = [
	..._.flatten(productionDependencies.map((d: any) => path.relative(root, d.path))
		.map((d: string) => [`${d}/**`, `!${d}/**/{test,tests}/**`])),
	// @ts-ignore JSON checking: dependencies is optional
];
gulp.task('create-asar-package', () => {
	return gulp.src(depsSrc, { base: '.', dot: true })
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

gulp.task('default', ['create-asar-package']);
