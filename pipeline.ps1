function Exec
{
	[CmdletBinding()]
	param(
		[Parameter(Position=0,Mandatory=1)][scriptblock]$cmd,
		[Parameter(Position=1,Mandatory=0)][string]$errorMessage = ($msgs.error_bad_command -f $cmd)
	)
	& $cmd
	if ($lastexitcode -ne 0) {
		throw ("Exec: " + $errorMessage)
	}
}

function MkDir($d) {
	# need rename to MakeNewDir
	if (!(Test-Path -Path $d)) {
		echo "Create Missing Directory: $d"
		New-Item -ItemType directory -Path (Split-Path -Path $d -Parent) -Name (Split-Path -Path $d -Leaf) -Force | Out-Null
	}
}
function RimDir($d) {
	if (Test-Path -Path $d) {
		echo "Remove Unexpect Directory: $d"
		Remove-Item -Recurse -Force $d
	}
}

function resolvePath() {
	param (
		[parameter(Mandatory = $true)] [String[]] $Parent,
		[parameter(Mandatory = $true, ValueFromRemainingArguments = $true)] [String[]] $childrens
	)
	
	$current = $Parent
	foreach ($element in $childrens) {
		$current = (Join-Path $current $element)
	}
	
	return ([IO.Path]::GetFullPath($current))
}

function downloadFile() {
	param (
		[parameter(Mandatory = $true)] [String] $Uri,
		[parameter(Mandatory = $true)] [String] $resultDownload
	)
	
	if (!(Test-Path -Path $resultDownload)) {
		echo "Downloading file From: $Uri, To: $resultDownload"
		$tempDownload = "${resultDownload}.partial"
		[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
		if ($proxy) {
			Invoke-WebRequest -Uri $Uri -OutFile $tempDownload -Proxy $proxy
		} else {
			Invoke-WebRequest -Uri $Uri -OutFile $tempDownload
		}
		Rename-Item -Path $tempDownload -NewName $resultDownload -Force
	} else {
		echo "Downloaded file: $resultDownload"
	}
}

$ErrorActionPreference = "Stop"
$env:CHILD_CONCURRENCY="1"
$WORKSPACE_ROOT="$(Get-Location)"
$BUILD_ROOT="$(resolvePath $WORKSPACE_ROOT build)"
$PRIVATE_BINS="$(resolvePath $BUILD_ROOT wrapping-bins)"
MkDir $PRIVATE_BINS

$env:Path="$PRIVATE_BINS;$env:Path"

downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7za.exe" (resolvePath $PRIVATE_BINS '7za.exe')
downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7za.dll" (resolvePath $PRIVATE_BINS '7za.dll')
downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7zxa.dll" (resolvePath $PRIVATE_BINS '7zxa.dll')
downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/py2.7z" (resolvePath $DOWNLOAD_PATH python2.7z)

7za x -y "-o$PRIVATE_BINS" -- $(resolvePath $DOWNLOAD_PATH python2.7z) | Out-Null

Get-ChildItem $PRIVATE_BINS

cd kendryte-ide
exec { yarn }
