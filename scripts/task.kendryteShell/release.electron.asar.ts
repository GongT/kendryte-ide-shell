import { relative } from 'path';
import { BUILD_ASAR_DIR, BUILD_DIST_SOURCE, WORKSPACE_ROOT, } from '../environment';
import { filter, gulp, task } from '../library/gulp';
import { simpleTransformStream } from '../library/gulp/transform';
import { createAsar } from '../library/vscode/asar';
import { cleanAsarTask } from '../library/gulp/cleanup';
import { releaseMakeTask } from './release.sources';

export const asarTask = task('release:app.asar', [releaseMakeTask, cleanAsarTask], () => {
	const relRemove = relative(WORKSPACE_ROOT, BUILD_DIST_SOURCE);
	return gulp
		.src('**', {
			base: BUILD_DIST_SOURCE,
			cwd: BUILD_DIST_SOURCE,
		})
		.pipe(filter(['**', '!**/.bin']))
		.pipe(createAsar(
			'.',
			[
				'**/7zip-bin/linux/**',
				'**/7zip-bin/mac/**',
				'**/7zip-bin/win/**',
			],
			'app.asar',
		))
		.pipe(simpleTransformStream(function rename(p) {
			p.path = p.path.replace(relRemove, '');
			return p;
		}))
		.pipe(gulp.dest(BUILD_ASAR_DIR));
});
