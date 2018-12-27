import { task } from '../library/gulp';
import { rimraf } from '../vscode/uitl';
import { packagesExtractPath } from './paths';

export const cleanupTask = task('offpack:cleanup', rimraf(packagesExtractPath));

