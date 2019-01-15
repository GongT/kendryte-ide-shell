[Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8
if (!$env:SYSTEM_COLLECTIONID) {
	chcp 65001 | Out-Null
}
$ErrorActionPreference = "Stop"

cd $PSScriptRoot
. ide\init-script\windows\fn.ps1
cd $PSScriptRoot
. ide\init-script\windows\env.ps1
cd $PSScriptRoot
. ide\init-script\windows\listcommands.ps1

if (!$env:AlreadyInited) {
	cd $PSScriptRoot
	. ide\init-script\windows\init.ps1
	
	setSystemVar 'AlreadyInited' $true
}

cd $VSCODE_ROOT

Set-Item -Path function:global:prompt -Value {
	$host.ui.rawui.WindowTitle = "Kendryte IDE Source Code :: $pwd"
	$Loc = $pwd.Path.Replace($VSCODE_ROOT, '')
	if ($Loc -eq $pwd) {
		return "P.S $pwd> "
	} else {
		return "KendryteIDE$Loc> "
	}
}.GetNewClosure()

#TODO: argument - run command
node "$MY_SCRIPT_ROOT_BUILT\init-script\help.js" --what-is-this

Write-Host " > The anwser is 42 <" -ForegroundColor Green

cd $VSCODE_ROOT # required last item

if ($args.Count -ne 0) {
	$env:BS_RUN_SCRIPT = 'YES'
	$cnt = $args.Count
	$cmd, $rst = $args
	Write-Host "Passing $cnt arguments, running it."
	Write-Host "   Command=$cmd"
	Write-Host "   Arguments=$rst"
	$ErrorActionPreference = "Continue"
	& $cmd @rst
	exit $LastExitCode
}

if (!$env:SYSTEM_COLLECTIONID) {
	[console]::WindowWidth = 100
	[console]::WindowHeight = 24
	[console]::BufferWidth = [console]::WindowWidth
}
