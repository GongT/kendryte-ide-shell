MkDir $RELEASE_ROOT
MkDir $HOME
MkDir $PRIVATE_BINS
MkDir $TMP
MkDir $DOWNLOAD_PATH

if (!(Test-Path -Path "$PRIVATE_BINS\node.bat")) {
	echo "Install Node.js"
	downloadFile "https://nodejs.org/dist/v8.11.2/win-x64/node.exe" "$DOWNLOAD_PATH/node8.exe"
	downloadFile "https://nodejs.org/dist/v11.6.0/win-x64/node.exe" "$DOWNLOAD_PATH/node.exe"
	
	echo "Coping node.exe from $DOWNLOAD_PATH to $NODEJS_INSTALL"
	RimDir $NODEJS_INSTALL\node8
	RimDir $NODEJS_INSTALL\node-latest
	MkDir $NODEJS_INSTALL\node8\bin
	MkDir $NODEJS_INSTALL\node-latest\bin
	Copy-Item "$DOWNLOAD_PATH\node8.exe" $NODEJS_INSTALL\node8\bin\node.exe -Force
	Copy-Item "$DOWNLOAD_PATH\node.exe" $NODEJS_INSTALL\node-latest\bin\node.exe -Force
	
	writeCmdFile node "
		set VSCODE_ROOT=$VSCODE_ROOT
		set NODEJS_INSTALL=$NODEJS_INSTALL
		call set XXXXXX=%%cd:%VSCODE_ROOT%=%%
		call set YYYYYY=%%cd:%RELEASE_ROOT%=%%
		IF NOT x%XXXXXX%==x%cd% GOTO use8
		IF NOT x%YYYYYY%==x%cd% GOTO use8

		:usel
		set NODEJS=$NODEJS_INSTALL\node-latest\bin\node.exe
		set PATH=$NODEJS_INSTALL\node-latest\bin;%PATH%
		echo node.bat Using node latest 1>&2
		GOTO end

		:use8
		set NODEJS=$NODEJS_INSTALL\node8\bin\node.exe
		set PATH=$NODEJS_INSTALL\node8\bin;%PATH%
		echo node.bat Using node 8 1>&2
		GOTO end

		:end
		%NODEJS% %*
	"
}

Write-Host "Detect Node.js: $VSCODE_ROOT"
Set-Location $VSCODE_ROOT
node --version
Write-Host "Detect Node.js: $WORKSPACE_ROOT"
Set-Location $WORKSPACE_ROOT
node --version

setSystemVar 'npm_config_target' $( cd $VSCODE_ROOT; node -p "require('./build/lib/electron').getElectronVersion();" )

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

& $NODEJS_INSTALL\node-latest\bin\node.exe "$MY_SCRIPT_ROOT/init-script/windows/pathinfo.js"
if (!$?) {
	throw "Network location ($VSCODE_ROOT) is not supported."
}

### yarn-install-build-tools
writeScriptFile yarn-install-build-tools @"
	[console]::WindowWidth=150
	[console]::WindowHeight=24
	[console]::BufferWidth=[console]::WindowWidth
	
	`$env:PATH='$PATH'
	`$env:YARN_CACHE_FOLDER='$YARN_CACHE_FOLDER'
	& '$NODEJS' ``
		'$NODEJS_INSTALL\node_modules\yarn\bin\yarn.js' ``
		global add windows-build-tools ``
			--prefer-offline --no-default-rc --no-bin-links ``
			--cache-folder '$YARN_CACHE_FOLDER' ``
	pause
"@
### yarn-install-build-tools

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
"@
### yarn.ps

if ( $env:SYSTEM_COLLECTIONID ) {
	
	downloadFile "http://www.python.org/ftp/python/2.7.6/python-2.7.6.amd64.msi" "$DOWNLOAD_PATH/python2.msi"
	$PythonPath = (resolvePath $BUILD_ROOT python27)
	get-item "$DOWNLOAD_PATH/python2.msi"
	echo "Downloaded, now install it to $PythonPath"
	& msiexec /a "$DOWNLOAD_PATH/python2.msi" /qb "TARGETDIR=$PythonPath"
	echo "Install finished"
	& "$PythonPath/python.exe" --version

} else {
	if (!(Get-Command python -errorAction SilentlyContinue)) {
		echo "================================================="
		echo "  Try install windows-build-tools"
		echo "  Please wait result from new window"
		echo "  "
		echo "  You need press Enter to continue"
		echo "================================================="
		
		Start-Process -Verb RunAs -Wait -FilePath powershell.exe -ArgumentList @("-NoExit", "-Command", $( resolvePath $PRIVATE_BINS "yarn-install-build-tools.ps1" ) )
		if (!$?) {
			throw "windows-build-tools cannot install"
		}
	}
	if (!(Get-Command python -errorAction SilentlyContinue)) {
		$PythonPath = (resolvePath $env:USERPROFILE .windows-build-tools\python27)
		throw "python cannot not install at $PythonPath, please install windows-build-tools and try again."
	}
}

### install node_modules for my scripts
if (!(Test-Path -Path "$MY_SCRIPT_ROOT_BUILT")) {
	echo "init scripts..."
	cd $WORKSPACE_ROOT
	yarn
	yarn global add node-gyp
	cd scripts
	tsc -p .
}
### install node_modules for my scripts

if (!(Test-Path -Path "$PRIVATE_BINS\git.bat")) {
	cd $TMP
	
	writeCmdFile finding-git @"
		set PATH=$ORIGINAL_PATH
		C:\Windows\System32\where.exe git
"@
	$GitLocation = (cmd.exe /c "finding-git")
	
	if (!$GitLocation) {
		throw "You need to install <github desktop>( https://desktop.github.com/ )."
	}
	
	writeCmdFile git @"
		set HOME=${ORIGINAL_HOME}
		set Path=${ORIGINAL_PATH}
	"$GitLocation" %*
"@
	
	cd $RELEASE_ROOT
	if (!(Test-Path -Path '.git')) {
		git init .
		echo '*' | Out-File -FilePath .gitignore -Encoding "ascii"
	}
}

cd $VSCODE_ROOT
