import { is } from 'electron-util';

const pathSp = is.windows? ';' : ':';

export function mergeEnv() {
	const cwd = process.cwd();
	const newEnv: NodeJS.ProcessEnv = {
		PATH: '',
	};
	Object.keys(process.env).forEach((k) => {
		if (k.toLowerCase() === 'path') {
			newEnv.PATH += process.env[k] + pathSp;
		} else {
			newEnv[k] = process.env[k];
		}
	});

	newEnv.LANG = 'C';

	return {
		cwd,
		env: newEnv,
	};
}
