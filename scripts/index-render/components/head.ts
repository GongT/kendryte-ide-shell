import { join } from 'path';
import { myScriptSourcePath } from '../../environment';
import { getWithCache } from '../../library/misc/httpUtil';

const {renderSync} = require('sass');

export async function buildHead(pieces: string[]) {
	const bs = await getWithCache('https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css');
	
	pieces.push(
		'<head>',
		'\t<meta charset="utf-8"/>',
		'\t<title>Kendryte IDE Downloads</title>',
		`\t<style type="text/css">${bs}</style>`,
		'\t<style type="text/css">',
	);
	
	const result = renderSync({
		file: join(myScriptSourcePath(__dirname), 'style.scss'),
		sourceMap: false,
		outputStyle: 'compressed',
	});
	
	pieces.push(result.css.toString('utf8'), '</style>');
	pieces.push('</head>');
}
