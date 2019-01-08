import { BUILD_ROOT, DOWNLOAD_PATH, myScriptSourcePath } from '../environment';
import { simpleCommandAt } from '../library/childprocess/complex';
import { gulp, gulpSrc, jeditor, mergeStream, rename, task } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { createDownload2Stream } from '../library/gulp/download';
import { ExS3 } from '../library/misc/awsUtil';
import { resolvePath } from '../library/misc/pathUtil';
import { rimraf } from '../library/vscode/uitl';

const downloadTo = resolvePath(DOWNLOAD_PATH, 'python2-windows.7z');
const extractTo = resolvePath(BUILD_ROOT, 'pipeline/python2');

const clean = task('pipeline:py2:clean', rimraf(extractTo));

const downloadPython2Task = task('pipeline:py2:download', [clean], () => {
	return createDownload2Stream(
		ExS3.instance().websiteUrl('3rd-party/pipeline-dependency/py2.7z'),
		downloadTo,
	);
});

const extractPython2Task = task('pipeline:py2:extract', [downloadPython2Task], () => {
	return extract7z(downloadTo, extractTo);
});

const createJsonTask = task('pipeline:py2:json', [extractPython2Task], () => {
	return mergeStream(
		gulpSrc(myScriptSourcePath(__dirname), 'python-package.json')
			.pipe(rename({basename: 'package'}))
			.pipe(jeditor({})),
		gulpSrc(myScriptSourcePath(__dirname), '.npmrc'),
	)
		.pipe(gulp.dest(extractTo));
});

task('pipeline:py2', [createJsonTask], () => {
	return simpleCommandAt(extractTo, 'yarn', 'publish', '-y', '--verbose');
});
