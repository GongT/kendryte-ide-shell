import { task } from '../library/gulp';
import { uploadTask } from './aws.upload';

export const awsCreateIndexTask = task('aws:update:index.html', [uploadTask], () => {

});

export const awsModifyJsonTask = task('aws:update:ide.json', [uploadTask], () => {

});
