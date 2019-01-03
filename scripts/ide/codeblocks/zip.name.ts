export const TYPE_ZIP_FILE = '7z';

export function packageFileName(platform: string, type: string) {
	return `${platform}.offlinepackages.${type}`;
}
