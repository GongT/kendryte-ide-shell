import { log } from '../../library/gulp';
import { nativePath } from '../../library/misc/pathUtil';

const queue = [
	'test-aws',
	'release-build',
	'release-create-tarball',
	'release-publish',
];

queue.forEach((item) => {
	const f = nativePath(__dirname, item + '.js');
	log('load ', f);
	require(f);
});
