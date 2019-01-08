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

function downloadFile()
{
	param (
		[ parameter(Mandatory = $true) ] [ String ] $Uri,
		[ parameter(Mandatory = $true) ] [ String ] $resultDownload
	)
	
	if ( !(Test-Path -Path $resultDownload) )
	{
		Write-Output "Downloading file From: $Uri, To: $resultDownload"
		$tempDownload = "${resultDownload}.partial"
		[ Net.ServicePointManager ]::SecurityProtocol = [ Net.SecurityProtocolType ]::Tls12
		if ( $env:HTTPS_PROXY )
		{
			Write-Output "Using proxy: $env:HTTPS_PROXY"
			Invoke-WebRequest -Uri $Uri -OutFile $tempDownload -Proxy $env:HTTPS_PROXY
		}
		else
		{
			Write-Output "Using direct connection."
			Invoke-WebRequest -Uri $Uri -OutFile $tempDownload
		}
		Write-Output "Downloaded file: $resultDownload"
		Rename-Item -Path $tempDownload -NewName $resultDownload -Force
	}
	else
	{
		Write-Output "Exists file: $resultDownload"
	}
}

if ( $env:AGENT_OS -eq "Linux" )
{
	Write-Output "LinuxPath is $env:PATH"
	sudo apt-get install p7zip-full
}
ElseIf ($env:AGENT_OS -eq "Darwin")
{
	Write-Output "MacPath is $env:PATH"
	$TMP = $env:TMPDIR
	downloadFile 'https://registry.npmjs.org/7zip-bin/-/7zip-bin-4.1.0.tgz' "$TMP/7zb.tar.gz"
	exec { tar xf "$TMP/7zb.tar.gz" -C $TMP } "Cannot extract 7zip-bin tar.gz"
	exec { sudo mkdir -p "$HOME/bin" } "Cannot create HOME/bin folder"
	exec { sudo cp "$TMP/package/mac/7za" "$HOME/bin/7za" } "Cannot copy 7za to HOME/bin"
	exec { sudo chmod a+x "$HOME/bin/7za" } "Cannot chmod (a+x) HOME/bin/7za"
	exec { 7za -h | Out-Null } "7za not executable, HOME/bin not in Path?"
}
Else
{
	# windows
	$TMP = $env:TMP
	Write-Output "WindowsPath is $env:PATH"
	
	exec { npm install '@kendryte-ide/windows-python2' '7zip' }
	
	$python = exec { yarn --silent run python -c 'import sys; print sys.executable' }
	Write-Output "Python is at $python"
	$pythonCallScript = @"
@echo off
`"$python`" %*
"@
	Write-Output $pythonCallScript.Replace( "`n", "`r`n" ) | Out-File -FilePath "C:/Windows/python.bat" -Encoding "ascii"
	
	npm config -g set python $python
	
	Write-Output "7Zip is at $PSScriptRoot\node_modules\7zip\7zip-lite\7z.exe"
	$7zipCallScript = @"
@echo off
`"$PSScriptRoot\node_modules\7zip\7zip-lite\7z.exe`" %*
"@
	Write-Output $7zipCallScript.Replace( "`n", "`r`n" ) | Out-File -FilePath "C:/Windows/7z.bat" -Encoding "ascii"
	Write-Output $7zipCallScript.Replace( "`n", "`r`n" ) | Out-File -FilePath "C:/Windows/7za.bat" -Encoding "ascii"
	
	Remove-Item -Recurse -Force $PSScriptRoot\node_modules\.bin
	
	exec { python --version } "python not executable..."
	exec { 7za -h | Out-Null } "7za not executable..."
	exec { 7z -h | Out-Null } "7za not executable..."
}
