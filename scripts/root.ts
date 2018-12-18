const {resolve} = require('path');
process.chdir(resolve(__dirname, '..'));
export const BUILD_ROOT = './';
export const BUILD_OUTPUT = './dist/';
export const BUILD_RELEASE_FILES = './release-assets/';


export const BUILD_DIST_ROOT = './build/';
export const BUILD_DIST_SOURCE = './build/source/';
export const BUILD_DIST_TARGETS = './build/release/';

export const ELECTRON_VERSION = 'v3.0.11';
