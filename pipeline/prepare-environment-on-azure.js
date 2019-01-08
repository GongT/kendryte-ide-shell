const {spawnSync} = require('child_process');
const {platform} = require('os');

// this file bootstrap powershell script with npm credentials, but it need to rewrite in js...

const isCI = !!process.env.SYSTEM_COLLECTIONID;
if (!isCI) {
	throw new Error('this script is for azure pipelines');
}

const pwsh = platform() === 'win32'? 'powershell.exe' : 'pwsh';

process.chdir(__dirname);
const cp = spawnSync(pwsh, [
	__filename.replace(/\.js$/, '.ps1'),
], {
	stdio: 'inherit',
	shell: false,
});
if (cp.error) {
	throw cp.error;
}
if (cp.signal) {
	console.error('process exit by signal:', cp.signal);
	process.exit(1);
}
if (cp.status !== 0) {
	process.exit(cp.status);
}

require('https').get('https://api.github.com/rate_limit', {
	headers: {
		'user-agent': 'Azure pipelines, powershell, GongT',
		'accept': '*/*',
	},
}, (res) => {
	Object.entries(res.headers).forEach(([k, v]) => {
		console.log('%s: %s', k, v);
	});
	let s = '';
	res.on('data', (d) => {
		s += d.toString('utf-8');
	});
	try {
		const data = JSON.parse(s);
		console.log(data);
		if (data.rate.remaining < 5) {
			console.error('GitHub rate limit is reaching! reset at %s', (new Date(data.rate.reset)).toISOString());
			process.exit(1);
		}
	} catch (e) {
		console.error(e.message);
		console.log(s);
	}
	process.exit(0);
}).on('error', (e) => {
	console.error('Cannot read github rate limit', e.message);
	process.exit(0);
});
