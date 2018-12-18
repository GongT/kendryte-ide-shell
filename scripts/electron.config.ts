import { ELECTRON_VERSION } from './root';

export const electronConfig = {
	version: ELECTRON_VERSION,
	arch: 'x64',
	productAppName: 'KendryteUpdater',
	companyName: 'Canaan Inc.',
	copyright: 'Copyright (C) 2018 Canaan. All rights reserved',
	darwinIcon: 'src/assets/icons/favicon.icns',
	darwinBundleIdentifier: 'io.canaan.kendryte.ide.updater',
	darwinApplicationCategoryType: 'public.app-category.developer-tools',
	darwinBundleURLTypes: [{
		role: 'Viewer',
		name: 'KendryteUpdater',
		urlSchemes: ['kendryte'],
	}],
	darwinForceDarkModeSupport: true,
	linuxExecutableName: 'KendryteUpdater',
	winIcon: 'src/assets/icons/favicon.ico',
	token: process.env['VSCODE_MIXIN_PASSWORD'] || process.env['GITHUB_TOKEN'] || void 0,
	repo: 'git@github.com:kendryte/kendryte-ide.git',
};
