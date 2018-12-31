$ErrorActionPreference = "Stop"
$env:CHILD_CONCURRENCY="1"


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

cd kendryte-ide
exec { yarn }
exec { npm run gulp -- electron-x64 }
exec { npm run gulp -- "vscode-win32-x64-min" }
exec { node build/lib/builtInExtensions.js }
