import { resolve } from 'path';
import { BUILD_ASAR_DIR, myScriptSourcePath, SHELL_ROOT } from '../environment';
import { everyPlatform, filter, gulp, gulpSrc, jeditor, mergeStream, rename, zip } from '../library/gulp';
import { cleanReleaseTask } from '../library/gulp/cleanup';
import { skipDirectories } from '../library/gulp/skipDirectories';
import { simpleTransformStream } from '../library/gulp/transform';
import { ExS3 } from '../library/misc/awsUtil';
import { nativePath } from '../library/misc/pathUtil';
import { getReleaseChannel } from '../library/releaseInfo/qualityChannel';
import { getIDEJsonObjectKey, getIndexPageObjectKey } from '../library/releaseInfo/s3Keys';
import { asarTask } from './release.electron.asar';
import { downloadTask, getElectronZipPath } from './release.electron.download';

function changeMacOsZip(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		if (path.dirname === '.') {
			path.dirname = 'Updater.app';
		} else {
			path.dirname = path.dirname.replace(/Electron\.app\//, 'Updater.app/');
		}
	});
}

function moveMyAppToUpdaterResourceFolder(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		path.dirname = 'Updater/resources/' + path.dirname;
	});
}

function macMoveMyAppToUpdaterResourceFolder(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		path.dirname = 'Updater.app/Contents/Resources/' + path.dirname;
	});
}

function moveElectronToUpdaterFolder(): NodeJS.WritableStream&NodeJS.ReadableStream {
	return rename((path: any) => {
		path.dirname = 'Updater/' + path.dirname;
	});
}

const zipResultEditor = {
	win32: moveElectronToUpdaterFolder,
	linux: moveElectronToUpdaterFolder,
	darwin: changeMacOsZip,
};

const asarResultEditor = {
	win32: moveMyAppToUpdaterResourceFolder,
	linux: moveMyAppToUpdaterResourceFolder,
	darwin: macMoveMyAppToUpdaterResourceFolder,
};

export const releaseTasks = everyPlatform('release:merge', [cleanReleaseTask, asarTask, downloadTask], (platform, root) => {
	const extractElectronSource = zip
		.src(getElectronZipPath(platform))
		.pipe(filter(['**', '!**/default_app.asar']))
		.pipe(zipResultEditor[platform]());
	
	let platform7Z = '';
	if (platform === 'win32') {
		platform7Z = `**/node_modules/7zip-bin/win/x64/7za.exe`;
	} else if (platform === 'linux') {
		platform7Z = `**/node_modules/7zip-bin/linux/x64/7za`;
	} else if (platform === 'darwin') {
		platform7Z = `**/node_modules/7zip-bin/mac/7za`;
	}
	
	const copyAsar = gulpSrc(BUILD_ASAR_DIR, ['app.asar', platform7Z])
		.pipe(asarResultEditor[platform]());
	const selfDir = nativePath(myScriptSourcePath(__dirname), 'release-assets', platform);
	
	const copyAssetsFiles = gulpSrc(selfDir, '**')
		.pipe(simpleTransformStream((f) => {
			if (f.basename === 'KendryteIDE.sh') {
				f.stat.mode = 493; // 755
			}
			return f;
		}));
	
	const createChannelJson = gulpSrc(SHELL_ROOT, 'channel.json')
		.pipe(jeditor({
			channel: getReleaseChannel(),
			registry: ExS3.instance().websiteUrl(getIDEJsonObjectKey(getReleaseChannel())),
			downloadPage: ExS3.instance().websiteUrl(getIndexPageObjectKey(getReleaseChannel())),
		}));
	
	return mergeStream(
		extractElectronSource,
		copyAsar,
		copyAssetsFiles,
		createChannelJson,
	)
		.pipe(skipDirectories())
		.pipe(gulp.dest(resolve(root, 'KendryteIDE')));
});
