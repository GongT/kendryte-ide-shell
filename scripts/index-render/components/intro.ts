import { getReleaseChannel } from '../../library/releaseInfo/qualityChannel';
import { styleMainType } from './styleMainType';

export function createIntro() {
	let versionLabel: string = '';
	if (getReleaseChannel() !== 'stable') {
		versionLabel = `&nbsp;
<span style="font-size:smaller" class="text-${styleMainType()}">
	(${getReleaseChannel().toUpperCase()})
</span>
`;
	}
	return `<div class="jumbotron">
	<h1 class="display-4">Kendryte IDE${versionLabel}</h1>
	<p class="lead en">
		To extract: just run the self extractor, or right click on it and choose "Extract to".<br/>
		Mac notice: this app is NOT signed now, do not place it in /Applications dir.<br/>
		<span class="alert">Do Not Download Offline Dependency Package If You Never Got Any Network Error</span>
	</p>
	<p class="lead cn">
		要解压缩，直接双击exe或bin文件即可，解压路径为当前目录。<br/>
		Mac注意事项：目前Kendryete IDE并没有签名，不要把它解压到 /Applications 里。<br/>
		Windows注意事项：部分杀毒软件把所有自解压包都认定是病毒，点击允许启动即可。如果不放心，可以右键解压缩。<br/>
		<span class="alert">如果你在启动过程中没有遇到任何网络问题，请不要下载离线依赖包！</span>
	</p>
	<div id="fastDown" class="d-hide">
		<hr class="my-4">
		<p></p>
		<a class="btn btn-${styleMainType()} btn-lg main" href="#" role="button">
			<span class="en">Download Kendryte IDE @&nbsp;</span>
			<span class="cn">下载 Kendryte IDE @&nbsp;</span>
		</a>
		<a class="btn btn-link pkg btn-sm text-mute" href="#" role="button">
			<span class="en" title="Extract, and copy 'data' dir into KendryteIDE">Download Offline Dependency Packages</span>
			<span class="cn" title="解压缩，并将data文件夹覆盖到KendryteIDE中">下载离线依赖包</span>
		</a>
	</div>
</div>`;
}