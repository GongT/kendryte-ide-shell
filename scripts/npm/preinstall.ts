import { runMain } from '../library/misc/myBuildSystem';
import { usePretty } from '../library/misc/usePretty';
import { reset_asar } from '../ide/codeblocks/resetAsar';

if (process.env.BUILDING) {
	console.error(' > preinstall: is BUILDING, skip.');
	process.exit(0);
}

runMain(async () => {
	const output = usePretty();
	await reset_asar(output);
});
