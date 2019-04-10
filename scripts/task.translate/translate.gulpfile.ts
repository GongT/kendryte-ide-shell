import { task } from '../library/gulp';
import { extract7z } from '../library/gulp/7z';
import { artifactsExtractedTempPath, artifactsLocalTempPath } from '../library/paths/ide';
import { artifactsFetchTask } from '../task.ideMain/artifacts';
import { cleanExtractTask } from '../task.ideMain/cleanup';
import { doCommitTranslate } from './commit';
import { doTranslate } from './prepare.work';

export const fetchIde = task('translate:ide', [artifactsFetchTask.linux, cleanExtractTask], () => {
	const saveTo = artifactsLocalTempPath('linux', 'latest');
	const extractTo = artifactsExtractedTempPath('linux', 'latest');
	
	return extract7z(saveTo, extractTo);
});

task('translate', [fetchIde], doTranslate);
task('translate:commit', [], doCommitTranslate);
