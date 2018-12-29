if (process.env.BUILDING) {
	console.error(' > preinstall: is BUILDING, skip.');
	process.exit(0);
} else {
	const script = __dirname + '/build/MyScriptBuildResult/npm/preinstall.js';
	if (require('fs').existsSync(script)) {
		require(script);
	}
}