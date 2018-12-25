import { resolve } from 'path';
import { cleanReleaseTask } from './cleanup';
import { es, everyPlatform, filter, gulp, jeditor, rename, zip } from './gulp';
import { asarTask } from './release.electron.asar';
import { downloadTask, getElectronZipPath } from './release.electron.download';
import { BUILD_DIST_ROOT, BUILD_RELEASE_FILES, BUILD_ROOT, getReleaseChannel, } from './root';
import { skipDirectories } from './vscode/uitl';

function prependMacElectronSourceRoot(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		path.dirname = path.dirname.replace(/(\.\/)?resources/, (m0: string, prep: string) => {
			return (prep || '') + 'Updater.app/Contents/Resources';
		});
	});
}

function changeMacOsZip(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		if (path.dirname === '.') {
			path.dirname = 'Updater.app';
		} else {
			path.dirname = path.dirname.replace(/Electron\.app\//, 'Updater.app/');
		}
	});
}

function prependUpdater(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		path.dirname = 'Updater/' + path.dirname;
	});
}

const zipResultEditor = {
	win32: prependUpdater,
	linux: prependUpdater,
	darwin: changeMacOsZip,
};

const asarResultEditor = {
	win32: prependUpdater,
	linux: prependUpdater,
	darwin: prependMacElectronSourceRoot,
};

export const releaseTasks = everyPlatform('release', [cleanReleaseTask, asarTask, downloadTask], (platform, root) => {
	const extractElectronSource = zip
		.src(getElectronZipPath(platform))
		.pipe(filter(['**', '!**/default_app.asar']))
		.pipe(zipResultEditor[platform]());
	
	const copyAsar = gulp.src(BUILD_DIST_ROOT + 'resources/**', {base: BUILD_DIST_ROOT})
	                     .pipe(filter([
		                     '**',
		                     '!**/node_modules/7zip-bin/**',
		                     `**/node_modules/7zip-bin/win/x64/7za.exe`,
		                     `**/node_modules/7zip-bin/linux/x64/7za`,
		                     `**/node_modules/7zip-bin/darwin/7za`,
	                     ]))
	                     .pipe(asarResultEditor[platform]());
	
	const copyAssetsFiles = gulp
		.src(BUILD_RELEASE_FILES + platform + '/**', {base: BUILD_RELEASE_FILES + platform});
	
	const createChannelJson = gulp
		.src(BUILD_ROOT + 'channel.json')
		.pipe(jeditor({
			channel: getReleaseChannel(),
		}));
	
	return es.merge(
		extractElectronSource,
		copyAsar,
		copyAssetsFiles,
		createChannelJson,
	)
	         .pipe(skipDirectories())
	         .pipe(gulp.dest(resolve(root, 'KendryteIDE')));
});