import { join } from 'path';
import { getWithCache } from '../../library/misc/httpUtil';

export async function buildHead(pieces: string[]) {
	const bs = await getWithCache('https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css');
	
	pieces.push(
		'<head>',
		'\t<meta charset="utf-8"/>',
		'\t<title>Kendryte IDE Downloads</title>',
		`\t<style type="text/css">${bs}</style>`,
		'\t<style type="text/css">',
	);
	
	const {renderSync} = require('sass');
	
	const result = renderSync({
		file: join(__dirname, 'style.scss'),
		sourceMap: false,
		indentType: 'tab',
	});
	
	pieces.push(result.css.toString('utf8'), '</style>');
	pieces.push('</head>');
}
