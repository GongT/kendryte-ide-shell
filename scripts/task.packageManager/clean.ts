import { BUILD_ROOT } from '../environment';
import { task } from '../library/gulp';
import { nativePath } from '../library/misc/pathUtil';
import { rimraf } from '../library/vscode/uitl';

export const PM_TEMP_DIR = nativePath(BUILD_ROOT, 'pm-temp');

export const clearPmLocalTempTask = task('pm:clear', rimraf(PM_TEMP_DIR));
