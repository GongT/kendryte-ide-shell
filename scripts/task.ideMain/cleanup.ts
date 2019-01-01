import { task } from '../library/gulp';
import { extractTempDir } from '../library/paths/ide';
import { rimraf } from '../library/vscode/uitl';

export const cleanExtractTask = task('ide:patches:clean', rimraf(extractTempDir()));
