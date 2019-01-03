MkDir $RELEASE_ROOT
MkDir $HOME
MkDir $PRIVATE_BINS
MkDir $TMP
MkDir $DOWNLOAD_PATH

if (!(Test-Path -Path "$PRIVATE_BINS\node.bat")) {
	echo "Install Node.js"
	downloadFile "https://nodejs.org/dist/v8.12.0/win-x64/node.exe" "$DOWNLOAD_PATH/node.exe"
	
	echo "Coping node.exe from $DOWNLOAD_PATH to $NODEJS_INSTALL"
	RimDir $NODEJS_INSTALL
	MkDir $NODEJS_INSTALL\bin
	Copy-Item "$DOWNLOAD_PATH\node.exe" $NODEJS_INSTALL\bin\node.exe -Force
	
	writeCmdFile node "
		set NODEJS=$NODEJS_INSTALL\bin\node.exe
		set VSCODE_ROOT=$VSCODE_ROOT
		set NODEJS_INSTALL=$NODEJS_INSTALL
		%NODEJS% %*
	"
}
Write-Host "Detect Node.js:"
node --version

if (!(Test-Path -Path "$PRIVATE_BINS/yarn.ps1")) {
	$tempDir = "$TMP/yarn-install"
	MkDir $tempDir
	
	downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7za.exe" (resolvePath $PRIVATE_BINS '7za.exe')
	downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7za.dll" (resolvePath $PRIVATE_BINS '7za.dll')
	downloadFile "https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7zxa.dll" (resolvePath $PRIVATE_BINS '7zxa.dll')
	downloadFile "https://yarnpkg.com/latest.tar.gz" "$DOWNLOAD_PATH/yarn.tgz"
	
	echo "Extracting yarn..."
	7za e -y "-o$TMP" -- "$DOWNLOAD_PATH/yarn.tgz" | Out-Null
	if (!$?) {
		echo "  failed..."
		exit 1
	}
	7za x -y "-o$tempDir" -- "$TMP/yarn.tar" | Out-Null
	if (!$?) {
		echo "  failed..."
		exit 1
	}
	RimDir "$TMP/yarn.tar"
	
	cd $tempDir
	(Get-ChildItem -Directory | Select-Object -Index 0).Name | cd
	echo "Install yarn to $NODEJS_INSTALL"
	node ".\bin\yarn.js" `
		--prefer-offline --no-default-rc --no-bin-links `
		--cache-folder "$YARN_CACHE_FOLDER" `
		--global-folder "$NODEJS_INSTALL" `
		--link-folder "$YARN_FOLDER" `
	global add yarn@latest
	cd $RELEASE_ROOT
	RimDir $tempDir
}

### npm
writeCmdFile npm @"
"$NODEJS" "$MY_SCRIPT_ROOT_BUILT\init-script\mock-npm.js" %*
"@
### npm

### yarn
writeCmdFile yarn @"
	powershell.exe `"$PRIVATE_BINS/yarn.ps1`" %*
"@
### yarn

### yarn.ps
writeScriptFile yarn @"
	`$env:npm_config_arch='$npm_config_arch'
	`$env:npm_config_disturl='$npm_config_disturl'
	`$env:npm_config_runtime='$npm_config_runtime'
	`$env:npm_config_cache='$npm_config_cache'
	`$env:npm_config_target='$npm_config_target'
	`$env:VSCODE_ROOT='$VSCODE_ROOT'
	`$env:YARN_FOLDER='$YARN_FOLDER'
	`$env:YARN_CACHE_FOLDER='$YARN_CACHE_FOLDER'
	`$env:PREFIX='$YARN_FOLDER'
	if( `$args.Count -eq 0 ) {
		`$args += ('install')
	}
	
	`$BL=""
	if ( (`$args | Select-String -Quiet -SimpleMatch "--no-bin-links") -OR (`$args | Select-String -Quiet -SimpleMatch "--no-bin-links") ){
		`$BL=""
	} else {
		if ( `$args[0] -eq "global" ) {
			`$BL="--no-bin-links"
		} else {
			`$BL="--bin-links"
		}
	}
	
	node ``
		'$NODEJS_INSTALL\node_modules\yarn\bin\yarn.js' ``
			--prefer-offline --no-default-rc `$BL ``
			--use-yarnrc '$VSCODE_ROOT/.yarnrc' ``
			--cache-folder '$YARN_CACHE_FOLDER' ``
			--global-folder '$NODEJS_INSTALL' ``
			--link-folder '$NODEJS_INSTALL\node_modules' ``
		`$args
	exit $LastExitCode
"@
### yarn.ps

Write-Host "Detect Python:"
python --version

### install node_modules for my scripts
if (!(Test-Path -Path "$MY_SCRIPT_ROOT_BUILT")) {
	Write-Host "init scripts..."
	Set-Location $WORKSPACE_ROOT
	yarn
	yarn global add node-gyp
	cd scripts
	tsc -p .
}
### install node_modules for my scripts

writeCmdFile git @"
	set HOME=${ORIGINAL_HOME}
	set Path=${ORIGINAL_PATH}
	git %*
"@

Write-Host "Detect Git:"
git --version

cd $VSCODE_ROOT
