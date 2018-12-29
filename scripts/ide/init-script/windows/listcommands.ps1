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
