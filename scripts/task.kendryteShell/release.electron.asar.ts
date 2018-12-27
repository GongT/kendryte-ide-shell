import { join } from 'path';
import { BUILD_DIST_ROOT, BUILD_DIST_SOURCE, } from '../environment';
import { filter, gulp, task } from '../library/gulp';
import { createAsar } from '../vscode/asar';
import { cleanAsarTask } from './cleanup';
import { releaseMakeTask } from './release.sources';

export const asarTask = task('release:app.asar', [releaseMakeTask, cleanAsarTask], () => {
	return gulp.src([BUILD_DIST_SOURCE, BUILD_DIST_SOURCE + '**'], {base: '.', dot: true})
	           .pipe(filter(['**', '!**/.bin']))
	           .pipe(createAsar(
		           BUILD_DIST_SOURCE,
		           [
			           '**/*.node',
			           '**/*.exe',
			           '**/*.dll',
			           '**/7zip-bin/linux/x64/7za',
			           '**/7zip-bin/mac/7za',
		           ],
		           join(BUILD_DIST_SOURCE + 'app.asar'),
	           ))
	           .pipe(gulp.dest(join(BUILD_DIST_ROOT, 'resources')));
});
