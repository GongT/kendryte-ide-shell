import { basename, resolve } from 'path';
import { RELEASE_ROOT } from '../../environment';
import { getOutputCommand, pipeCommandOut } from '../../library/childprocess/complex';
import { log } from '../../library/gulp';
import { IRemotePackageRegistry } from '../../library/jsonDefine/packageRegistry';
import { ExS3 } from '../../library/misc/awsUtil';
import { isExists } from '../../library/misc/fsUtil';
import { whatIsThis } from '../../library/misc/help';
import { runMain } from '../../library/misc/myBuildSystem';
import { ensureChdir } from '../../library/misc/pathUtil';
import { OBJKEY_PACKAGE_MANAGER_LIBRARY } from '../../library/releaseInfo/s3Keys';
import { escapeRegExpCharacters } from '../codeblocks/escapeRegExpCharacters';
import { readPackageInfo } from '../package-manager/packageInfo';

whatIsThis(
	'Register an example or library with its GitHub repo',
	'通过GitHub仓库发布一个依赖或样例程序',
);

const usage = `
library-publish [git remote url] [git RELEASE branch name]
	all argument is required.
`;

runMain(async () => {
	const args = process.argv.slice(2);
	const gitRemote = args.shift();
	const gitBranch = args.shift();
	
	if (!gitRemote) {
		throw new Error('git remote is required.' + usage);
	}
	if (!gitBranch) {
		throw new Error('git branch is required.' + usage);
	}
	
	const dir = basename(gitRemote, '.git');
	const packRoot = resolve(RELEASE_ROOT, 'package-manager', dir);
	ensureChdir(packRoot);
	if (await isExists(resolve(packRoot, '.git'))) {
		log('repo is already exists, simple check.');
		const branchOut = await getOutputCommand('git', 'branch');
		const reg = new RegExp('/^\\* (' + escapeRegExpCharacters(gitBranch) + ')$/');
		const m = reg.exec(branchOut);
		if (!m) {
			throw new Error('local cache has different branch than your input, you need delete it. the folder is ' + packRoot);
		}
		
	} else {
		log('repo is not exists, clone new.');
		await pipeCommandOut(process.stderr, 'git', 'clone', '-b', gitBranch, gitRemote);
	}
	
	const data = await readPackageInfo(packRoot);
	
	log('reading registry file...');
	const remote = await ExS3.instance().loadJson<IRemotePackageRegistry>(OBJKEY_PACKAGE_MANAGER_LIBRARY);
	log('registry file loaded.');
	const exists = findPackage(remote, data.name);
	if (exists) {
		throw new Error('Failed to register new package, same name is already exists. new version use: library-publish-version.');
	}
	
	remote.push({
		name: data.name,
		// icon:
		description: 'official library of ' + data.name,
		homepage: gitRemote,
		versions: [],
		type: 'library',
	});
	
	log('update registry file...');
	await ExS3.instance().putJson(OBJKEY_PACKAGE_MANAGER_LIBRARY, remote);
});

function findPackage(remote: IRemotePackageRegistry, name: string) {
	return remote.find(e => e.name === name);
}
