import { reset_asar } from '../ide/codeblocks/resetAsar';
import { runMain } from '../library/misc/myBuildSystem';

runMain(async () => {
	await reset_asar();
});
