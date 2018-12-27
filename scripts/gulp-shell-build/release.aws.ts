import { PassThrough } from 'stream';
import { getReleaseChannel } from '../environment';
import { createIndexFileContent } from '../index-render';
import { jeditor, log, printFileContent, task } from '../library/gulp';
import { gulpS3 } from '../library/gulp/aws';
import { createReleaseTag } from './releaseTag';

const Vinyl = require('vinyl');

export function createIndex() {
	const pass = new PassThrough({objectMode: true});
	
	createIndexFileContent().then((indexContent) => {
		const jsFile = new Vinyl({
			cwd: '/',
			base: '/',
			path: '/index.html',
			contents: new Buffer(indexContent, 'utf8'),
		});
		pass.write(jsFile);
		setImmediate(() => {
			pass.end();
		});
	});
	return pass;
}

export const awsModifyJsonTask = task('aws:update.json', [], () => {
	const version = createReleaseTag();
	log.info('current verison is:', version);
	return gulpS3.src(`release/IDE.${getReleaseChannel()}.json`)
	             .pipe(jeditor({
		             updaterVersion: version,
	             }))
	             .pipe(printFileContent())
	             .pipe(gulpS3.dest());
});
export const awsCreateIndexTask = task('aws:create.index', [], async () => {
});
