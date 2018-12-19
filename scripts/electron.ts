import { existsSync } from 'fs';
import { platform } from 'os';
import { basename, resolve } from 'path';
import { TASK_BUILD } from './release';
import { BUILD_DIST_ROOT, BUILD_DIST_SOURCE, BUILD_DIST_TARGETS, BUILD_RELEASE_FILES, ELECTRON_VERSION, getReleaseChannel, } from './root';
import { createAsar } from './vscode/asar';
import { rimraf, skipDirectories } from './vscode/uitl';

const download = require('gulp-download2');
const gulp = require('gulp');
const filter = require('gulp-filter');
const zip = require('gulp-vinyl-zip');
const es = require('event-stream');
const rename = require('gulp-rename');
const run = require('gulp-run-command').default;
const jeditor = require('gulp-json-editor');

const platforms = ['win32', 'darwin', 'linux'];

function buildElectronUrl(plat: string = platform()) {
	const v = ELECTRON_VERSION.replace(/^v/, '');
	return `https://npm.taobao.org/mirrors/electron/${v}/electron-${ELECTRON_VERSION}-${plat}-x64.zip`;
}

function whereToSave(url: string) {
	return resolve('./build/download', basename(url));
}

function downloadTask() {
	const task = 'download-electron';
	gulp.task(task, () => {
		const toDownloads = platforms.map(buildElectronUrl).filter((url) => {
			return !existsSync(whereToSave(url));
		});
		if (toDownloads.length) {
			return download(toDownloads)
				.pipe(gulp.dest('./build/download'));
		}
	});
	return task;
}

export function asarTask() {
	const task = 'electron:asar';
	const cleanAsar = 'electron:asar:clean';
	const cleanRelease = 'electron:release:clean';
	gulp.task(cleanAsar, rimraf(resolve(BUILD_DIST_ROOT, 'resources/**')));
	gulp.task(cleanRelease, rimraf(resolve(BUILD_DIST_ROOT, 'release/**')));
	gulp.task(task, [TASK_BUILD, cleanAsar, cleanRelease], () => {
		return gulp.src(BUILD_DIST_SOURCE + '/**', {base: '.', dot: true})
		           .pipe(filter(['**', '!**/.bin']))
		           .pipe(createAsar(
			           resolve(process.cwd(), BUILD_DIST_SOURCE),
			           [
				           '**/*.node',
				           '**/*.exe',
				           '**/*.dll',
				           '**/7zip-bin/linux/x64/7za',
				           '**/7zip-bin/mac/7za',
			           ],
			           resolve(process.cwd(), BUILD_DIST_ROOT, 'resources/app.asar'),
		           ))
		           .pipe(gulp.dest(resolve(BUILD_DIST_ROOT, 'resources')));
	});
	return task;
}

function changeMacOs(p: NodeJS.ReadableStream): NodeJS.ReadableStream {
	return p.pipe(rename((path: any) => {
		path.dirname = path.dirname.replace(/(\.\/)?resources/, (m0, prep) => {
			return (prep || '') + 'Updater.app/Contents/Resources';
		});
	}));
}

function changeMacOsZip(p: NodeJS.ReadableStream): NodeJS.ReadableStream {
	return p.pipe(rename((path: any) => {
		if (path.dirname === '.') {
			path.dirname = 'Updater.app';
		} else {
			path.dirname = path.dirname.replace(/Electron\.app\//, 'Updater.app/');
		}
	}));
}

function prependUpdater(p: NodeJS.ReadableStream): NodeJS.ReadableStream {
	return p.pipe(rename((path: any) => {
		path.dirname = 'Updater/' + path.dirname;
	}));
}

function createReleases() {
	const tasks: string[] = [];
	for (const platform of platforms) {
		const zipFile = whereToSave(buildElectronUrl(platform));
		const createDist = 'release:' + platform;
		const currentPlatformDir = resolve(process.cwd(), BUILD_DIST_TARGETS, platform);
		
		const currentTarget = resolve(currentPlatformDir, 'KendryteIDE');
		const wrap = platform === 'darwin'? changeMacOs : prependUpdater;
		const wrapZ = platform === 'darwin'? changeMacOsZip : prependUpdater;
		
		gulp.task(createDist, [downloadTask(), asarTask()], () => {
			return es.merge(
				wrapZ(zip.src(zipFile).pipe(filter(['**', '!**/default_app.asar']))),
				wrap(gulp.src(BUILD_DIST_ROOT + 'resources/**', {base: BUILD_DIST_ROOT})),
				gulp.src(BUILD_RELEASE_FILES + platform + '/**', {base: BUILD_RELEASE_FILES + platform}),
				gulp.src('./channel.json').pipe(jeditor({channel: getReleaseChannel()})),
			).pipe(skipDirectories()).pipe(gulp.dest(currentTarget));
		});
		
		const createZip = 'release:' + platform + ':7z';
		const szCmd = [
			require('7zip-bin').path7za,
			'a',
			'-y',
			'-ms=on',
			'-mx8',
			'-mmt',
			'-ssc',
			`../${getReleaseChannel()}.${platform}.7z`,
			'KendryteIDE',
		].join(' ');
		gulp.task(createZip, [createDist], run(szCmd, {cwd: currentPlatformDir}));
		
		tasks.push(createZip);
	}
	
	return tasks;
}

export function createYarnTask() {
	const task = 'electron';
	gulp.task(task, createReleases());
	return task;
}