import { log } from '../../library/gulp';
import { nativePath } from '../../library/misc/pathUtil';
import { isWin } from '../../environment';

const queue = isWin ? [
	'release-build-pipeline',
	'release-publish',
] : [
	'release-build',
	'release-publish',
];

queue.forEach((item) => {
	const f = nativePath(__dirname, item + '.js');
	log('load ', f);
	require(f);
});
