import { task } from '../library/gulp';
import { rimraf } from '../library/vscode/uitl';
import { getPackagesExtractRoot } from './paths';

export const cleanupTask = task('offpack:cleanup', rimraf(getPackagesExtractRoot('.')));

