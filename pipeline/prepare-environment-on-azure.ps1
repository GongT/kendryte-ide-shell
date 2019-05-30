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
  
  New-Item -ItemType Directory -Path "$env:TMPDIR/szip"
  Set-Location "$env:TMPDIR/szip"
  Write-Host "-->> vso[task.prependpath]$env:TMPDIR/szip"
  Write-Host "##vso[task.prependpath]$env:TMPDIR/szip"
  
  downloadFile "https://registry.npmjs.org/7zip-bin/-/7zip-bin-4.1.0.tgz" "7zb.tar.gz"
  exec { tar xf "7zb.tar.gz" } "Cannot extract 7zip-bin tar.gz"
  Copy-Item -Path "package/mac/7za" -Destination "7za" -Verbose
  Copy-Item -Path "package/mac/7za" -Destination "7z" -Verbose
}
Else
{
  # windows
  Write-Output "WindowsPath is $env:PATH"
  
  New-Item -ItemType Directory -Path "$env:TMP\szip"
  Set-Location "$env:TMP\szip"
  Write-Host "-->> vso[task.prependpath]$env:TMP\szip\node_modules\7zip\7zip-lite"
  Write-Host "##vso[task.prependpath]$env:TMP\szip\node_modules\7zip\7zip-lite"

  exec { npm init -y }
  exec { npm install '7zip' }

  Copy-Item -Path "node_modules\7zip\7zip-lite\7z.exe" -Destination "node_modules\7zip\7zip-lite\7za.exe" -Verbose
#  exec { 7za -h | Out-Null } "7za not executable..."
#  exec { 7z -h | Out-Null } "7z not executable..."
}

exec { npm install -g 'node-gyp' }
