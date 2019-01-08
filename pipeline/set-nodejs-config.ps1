$ErrorActionPreference = "Stop"
$env:CHILD_CONCURRENCY = "1"

function Exec {
	[CmdletBinding()]
	param (
		[Parameter(Position = 0, Mandatory = 1)][scriptblock]$cmd,
		[Parameter(Position = 1, Mandatory = 0)][string]$errorMessage = ($msgs.error_bad_command -f $cmd)
	)
	& $cmd
	if ($lastexitcode -ne 0) {
		throw ("Exec: " + $errorMessage)
	}
}

exec { npm config -g set prefer-offline true }

$npmGlobal=(exec { npm config get prefix })
exec { yarn config set prefix $npmGlobal }

exec { npm config -g set @kendryte-ide:registry https://gongt.pkgs.visualstudio.com/_packaging/deps-cache/npm/registry/ }

