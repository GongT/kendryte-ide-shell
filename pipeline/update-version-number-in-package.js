const {writeFileSync} = require('fs');
const {resolve} = require('path');

function createReleaseTag() {
	if (process.env.BUILD_BUILDNUMBER) {
		return '' + process.env.BUILD_BUILDNUMBER;
	} else {
		console.error('BUILD_BUILDNUMBER is not set, this script only for pipelines');
		process.exit(1);
	}
}

function getReleaseChannel() {
	let channel = '' + process.env.CHANNEL;
	switch (channel) {
	case 'a':
	case 'alpha':
		channel = 'alpha';
		break;
	case 'b':
	case 'beta':
		channel = 'beta';
		break;
	case 's':
	case 'stable':
		channel = 'stable';
		break;
	default:
		console.error('Please set env `CHANNEL` to "alpha" or "beta" or "stable". (or a/b/s)');
		process.exit(1);
	}
	return channel;
}

process.chdir(process.env.SYSTEM_DEFAULTWORKINGDIRECTORY);
console.log('working inside directory: %s', process.cwd());

// package
const packageJson = resolve(process.cwd(), 'package.json');
const pkg = require(packageJson);
pkg.patchVersion = createReleaseTag();
writeFileSync(packageJson, JSON.stringify(pkg, null, 4), 'utf8');

// product
const productJson = resolve(process.cwd(), 'product.json');
const product = require(productJson);
product.quality = getReleaseChannel();
writeFileSync(productJson, JSON.stringify(product, null, 2), 'utf8');
