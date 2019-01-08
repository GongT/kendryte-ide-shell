console.log('GET https://api.github.com/rate_limit');
require('https').get({
	protocol: 'https:',
	host: 'api.github.com',
	path: '/rate_limit',
	headers: {
		'user-agent': 'Azure pipelines, powershell, GongT',
		'accept': 'application/json',
		'host': 'api.github.com',
	},
}, (res) => {
	Object.entries(res.headers).forEach(([k, v]) => {
		console.log('%s: %s', k, v);
	});
	let s = '';
	res.on('data', (d) => {
		s += d.toString('utf-8');
	});
	
	res.on('end', () => {
		try {
			const data = JSON.parse(s);
			console.log(JSON.stringify(data, null, 4));
			console.error('RESET at %s', (new Date(data.rate.reset)).toISOString());
			if (data.rate.remaining < 5) {
				console.error('GitHub rate limit is reaching!');
				process.exit(1);
			}
		} catch (e) {
			console.error(e.message);
			console.log('rate limit: %s', s);
		}
		process.exit(0);
	}).on('error', (e) => {
		console.error('Cannot read github rate limit', e.message);
		process.exit(0);
	});
}).on('error', (e) => {
	console.error('Cannot read github rate limit', e.message);
	process.exit(0);
});
