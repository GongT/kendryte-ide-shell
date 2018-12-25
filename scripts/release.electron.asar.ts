import { resolve } from 'path';
import { cleanAsarTask } from './cleanup';
import { filter, gulp, task } from './gulp';
import { releaseMakeTask } from './release.sources';
import { BUILD_DIST_ROOT, BUILD_DIST_SOURCE, } from './root';
import { createAsar } from './vscode/asar';

export const asarTask = task('release:app.asar', [releaseMakeTask, cleanAsarTask], () => {
	return gulp.src(BUILD_DIST_SOURCE + '/**', {base: '.', dot: true})
	           .pipe(filter(['**', '!**/.bin']))
	           .pipe(createAsar(
		           resolve(process.cwd(), BUILD_DIST_SOURCE),
		           [
			           '**/*.node',
			           '**/*.exe',
			           '**/*.dll',
			           '**/7zip-bin/linux/x64/7za',
			           '**/7zip-bin/mac/7za',
		           ],
		           resolve(process.cwd(), BUILD_DIST_ROOT, 'resources/app.asar'),
	           ))
	           .pipe(gulp.dest(resolve(BUILD_DIST_ROOT, 'resources')));
});
