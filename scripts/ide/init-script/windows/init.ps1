MkDir $RELEASE_ROOT
MkDir $HOME
MkDir $PRIVATE_BINS
MkDir $TMP
MkDir $DOWNLOAD_PATH

if (!(Test-Path -Path "$PRIVATE_BINS\node.bat")) {
	echo "Install Node.js"
	$VERSION=11.6.0
	downloadFile "https://nodejs.org/dist/v8.11.2/win-x64/node.exe" "$DOWNLOAD_PATH/node8.exe"
	downloadFile "https://nodejs.org/dist/v$VERSION/win-x64/node.exe" "$DOWNLOAD_PATH/node.exe"
	
	echo "Coping node.exe from $DOWNLOAD_PATH to $NODEJS_INSTALL"
	RimDir $NODEJS_INSTALL\node8
	RimDir $NODEJS_INSTALL\node-latest
	MkDir $NODEJS_INSTALL\node8\bin
	MkDir $NODEJS_INSTALL\node-latest\bin
	Copy-Item "$DOWNLOAD_PATH\node8.exe" $NODEJS_INSTALL\node8\bin\node.exe -Force
	Copy-Item "$DOWNLOAD_PATH\node.exe" $NODEJS_INSTALL\node-latest\bin\node.exe -Force
	
	writeCmdFile node "
		set VSCODE_ROOT=$VSCODE_ROOT
		call set XXXXXX=%cd:%VSCODE_ROOT%=%
		IF x%XXXXXX%==x%VSCODE_ROOT% (
			set NODEJS=$NODEJS_INSTALL\node-latest\bin\node.exe
			set PATH=$NODEJS_INSTALL\node-latest\bin;%PATH%
			echo Using node latest 1>&2
		) ELSE (
			set NODEJS=$NODEJS_INSTALL\node8\bin\node.exe
			set PATH=$NODEJS_INSTALL\node8\bin;%PATH%
			echo Using node 8 1>&2
		)
		%NODEJS% %*
	"
	writeScriptFile node "
		`$env:PRIVATE_BINS='$PRIVATE_BINS'
		`$env:VSCODE_ROOT='$VSCODE_ROOT'
		if ( `$pwd -like "`${VSCODE_ROOT}*" ) {
			`$env:NODEJS='$NODEJS_INSTALL\node-latest\bin\node.exe'
			`$NODEJS='$NODEJS_INSTALL\node-latest\bin\node.exe'
			`$PATH='$NODEJS_INSTALL\node-latest\bin;`$PATH'
			Write-Error Using node latest
		} else {
			`$env:NODEJS='$NODEJS_INSTALL\node8\bin\node.exe'
			`$NODEJS='$NODEJS_INSTALL\node8\bin\node.exe'
			`$PATH='$NODEJS_INSTALL\node8\bin;`$PATH'
			Write-Error Using node 8
		}
		`$NODEJS `$args
	"
}

echo "Detect Node.js: $( cd $VSCODE_ROOT; & node --version )"
echo "Detect Node.js: $( & node --version )"
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
	7za x -y "-o$DOWNLOAD_PATH" -- "$TMP/yarn.tar" | Out-Null
	if (!$?) {
		echo "  failed..."
		exit 1
	}
	RimDir "$TMP/yarn.tar"
	
	cd $tempDir
	(Get-ChildItem -Directory | Select-Object -Index 0).Name | cd
	echo "Install yarn to $NODEJS_INSTALL"
	& $NODEJS ".\bin\yarn.js" `
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
	
	& '$NODEJS' ``
		'$NODEJS_INSTALL\node_modules\yarn\bin\yarn.js' ``
			--prefer-offline --no-default-rc `$BL ``
			--use-yarnrc '$VSCODE_ROOT/.yarnrc' ``
			--cache-folder '$YARN_CACHE_FOLDER' ``
			--global-folder '$NODEJS_INSTALL' ``
			--link-folder '$NODEJS_INSTALL\node_modules' ``
		`$args
"@
### yarn.ps

### install node_modules for my scripts
if (!(Test-Path -Path "$MY_SCRIPT_ROOT_BUILT")) {
	echo "init scripts..."
	cd $WORKSPACE_ROOT
	yarn --silent --no-bin-links
	cd scripts
	tsc -p .
}
### install node_modules for my scripts

if (!(Get-Command python -errorAction SilentlyContinue)) {
	echo "================================================="
	echo "  Try install windows-build-tools"
	echo "  Pplease wait result from new window"
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

if (!(Test-Path -Path "$PRIVATE_BINS\git.bat")) {
	cd $TMP
	
	$GitLocation = $f.FullName
	writeCmdFile finding-git @"
		@echo off
		set PATH=$ORIGINAL_PATH
		C:\Windows\System32\where.exe git
"@
	$GitLocation = (cmd.exe /c "finding-git")
	
	if (!$GitLocation) {
		throw "You need to install <github desktop>( https://desktop.github.com/ )."
	}
	
	writeCmdFile git @"
		@echo off
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
