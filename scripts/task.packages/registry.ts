import { log, task } from '../library/gulp';
import { ExS3 } from '../library/misc/awsUtil';
import { IThirdPartyRegistry } from './3rd-registry';

export let thirdRegistry: IThirdPartyRegistry;
export const registryTask = task('offpack:registry', async () => {
	log('Loading ThirdParty packages registry: %s', ExS3.instance().websiteUrl('3rd-party/versions.json'));
	thirdRegistry = await ExS3.instance().loadJson<IThirdPartyRegistry>('3rd-party/versions.json');
	log('ThirdParty packages registry: %s', JSON.stringify(thirdRegistry, null, 4));
});
