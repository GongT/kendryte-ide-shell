Get-ChildItem -Path "$MY_SCRIPT_ROOT\commands" -File -Filter '*.ts' -Name | Foreach-Object {
	$command = $_.Replace('.ts', '')
	Set-Item -Path function:global:$command -Value {
		try {
			Push-Location
			Set-Location $MY_SCRIPT_ROOT_BUILT
			node "init-script\load-command.js" "${command}" @args
			if (!$?) {
				throw "Command failed with code ${LastExitCode}"
			}
		} finally {
			Pop-Location
		}
	}.GetNewClosure()
}

function Fork {
	param (
		[parameter(Mandatory = $false)] [String[]] $Action,
		[parameter(Mandatory = $false, ValueFromRemainingArguments = $true)] [String[]] $list
	)
	if ($Action) {
		$argList = @("node", "$MY_SCRIPT_ROOT_BUILT\init-script\load-command.js", $Action )
		if ($list) {
			$argList += $list
		}
		Start-Process -ArgumentList $argList -FilePath powershell.exe
	} else {
		Start-Process powershell.exe "-NoExit -Command . `"$WORKSPACE_ROOT\script\start.ps1`""
	}
}
Set-Item -Path function:global:fork -Value ${function:Fork}
