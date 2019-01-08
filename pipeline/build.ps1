$ErrorActionPreference = "Stop"
$env:CHILD_CONCURRENCY = "1"

function Exec
{
	[ CmdletBinding() ]
	param (
		[ Parameter(Position = 0, Mandatory = 1) ][ scriptblock ]$cmd,
		[ Parameter(Position = 1, Mandatory = 0) ][ string ]$errorMessage = ($msgs.error_bad_command -f $cmd)
	)
	& $cmd
	if ( $lastexitcode -ne 0 )
	{
		throw ("Exec: " + $errorMessage)
	}
}

#exec { npm run gulp -- electron-x64 }

if ( $env:AGENT_OS -eq "Linux" )
{
	exec { npm run gulp -- "vscode-linux-x64" }
}
ElseIf ($env:AGENT_OS -eq "Darwin")
{
	exec { npm run gulp -- "vscode-darwin" }
}
Else
{
	exec { npm run gulp -- "vscode-win32-x64" }
}

exec { node build/lib/builtInExtensions.js }
