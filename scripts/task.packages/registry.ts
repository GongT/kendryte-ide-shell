import { task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { convertRegistry } from './3rd-registry';
import File = require('vinyl');

export const registryTask = task('offpack:registry', (platform) => {
	return gulpS3.src(['3rd-party/versions.json'])
	             .on('data', (file: File) => {
		             convertRegistry(file.contents as Buffer);
	             });
});
