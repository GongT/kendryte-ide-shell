import { runMain } from '../library/misc/myBuildSystem';
import { usePretty } from '../library/misc/usePretty';
import { reset_asar } from '../ide/codeblocks/resetAsar';

runMain(async () => {
	const output = usePretty();
	await reset_asar(output);
});
