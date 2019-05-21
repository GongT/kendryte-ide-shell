
function showHelp {
	node "$MY_SCRIPT_ROOT_BUILT\init-script\help.js" --what-is-this @args
}
Set-Item -Path function:global:show-help -Value ${function:showHelp}

function Fork {
	param (
		[parameter(Mandatory = $false)] [String[]] $Action,
		[parameter(Mandatory = $false, ValueFromRemainingArguments = $true)] [String[]] $list
	)
	if ($Action) {
		$argList = @("node", "$MY_SCRIPT_ROOT_BUILT\init-script\load-command.js", $Action)
		if ($list) {
			$argList += $list
		}
		Start-Process -ArgumentList $argList -FilePath powershell.exe
	} else {
		Start-Process powershell.exe "-NoExit -Command . `"$WORKSPACE_ROOT\scripts\start.ps1`""
	}
}
Set-Item -Path function:global:fork -Value ${function:Fork}

function d1 {
	Set-Location ${VSCODE_ROOT}
	echo "-> $(Get-Location)"
}
Set-Item -Path function:global:d1 -Value ${function:d1}

function d2 {
	Set-Location ${WORKSPACE_ROOT}
	echo "-> $(Get-Location)"
}
Set-Item -Path function:global:d2 -Value ${function:d2}

function fake-aws {
	param (
		[String] $CHANNEL = "sourcecode"
	)
	$env:AWS_SECRET_ACCESS_KEY = "fake"
	$env:AWS_REGION = "cn-northwest-1"
	$env:AWS_ACCESS_KEY_ID = "fake"
	$env:AWS_BUCKET = "kendryte-ide"
	$env:CHANNEL = $CHANNEL
}
Set-Item -Path function:global:fake-aws -Value ${function:fake-aws}
