# this file is not execute by pipeline, it's content has to copy to a powershell task.
#  * https://dev.azure.com/GongT/kendryte-ide/_taskgroup/4507e65a-f04f-47a0-a1e7-96637cb9c1d3
#  * <shell-code>/pipeline/init-nodejs.ps1

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

exec {
  node -e @"
    console.log('================================ environment check ================================');
    console.log('CWD %s', process.cwd());
    const {platform} = require('os');

    const platformName = platform();
    const builtName = platformName === 'darwin'? platformName : platformName + '-x64';
    
    console.log('##vso[task.setvariable variable=platform;isOutput=true]%s', platformName);
    console.log('Azure SetVariable: platform=%s', platformName);
    console.log('##vso[task.setvariable variable=builtName;isOutput=true]%s', builtName);
    console.log('Azure SetVariable: builtName=%s', builtName);

    console.log('ENV: BUILD_ARTIFACTSTAGINGDIRECTORY=%s', process.env.BUILD_ARTIFACTSTAGINGDIRECTORY);
    console.log('ENV: CHANNEL=%s', process.env.CHANNEL);

    console.log('================================ environment check end ================================');
"@
}
