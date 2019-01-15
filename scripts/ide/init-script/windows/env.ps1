if (!$env:ORIGINAL_HOME) {
	setSystemVar 'ORIGINAL_HOME' $HOME
}
if (!$env:ORIGINAL_PATH) {
	setSystemVar 'ORIGINAL_PATH' $env:PATH
}

setSystemVar 'WORKSPACE_ROOT' (resolvePath $PSScriptRoot ..\..\..\..)
setSystemVar 'MY_SCRIPT_ROOT' (resolvePath $WORKSPACE_ROOT scripts\ide)
setSystemVar 'VSCODE_ROOT' (resolvePath $WORKSPACE_ROOT ..\kendryte-ide)
setSystemVar 'BUILD_ROOT' (resolvePath $WORKSPACE_ROOT build)
setSystemVar 'MY_SCRIPT_ROOT_BUILT' (resolvePath $BUILD_ROOT MyScriptBuildResult/ide)
setSystemVar 'DOWNLOAD_PATH' (resolvePath $BUILD_ROOT download)
setSystemVar 'RELEASE_ROOT' (resolvePath $BUILD_ROOT ide-main-release)
setSystemVar 'FAKE_HOME' (resolvePath $BUILD_ROOT FAKE_HOME)
setSystemVar 'HOME' $FAKE_HOME

setSystemVar 'NODEJS_INSTALL' (resolvePath $BUILD_ROOT nodejs)

setSystemVar 'YARN_FOLDER' (resolvePath $BUILD_ROOT yarn)
setSystemVar 'PREFIX' $YARN_FOLDER
setSystemVar 'YARN_CACHE_FOLDER' (resolvePath $YARN_FOLDER cache)

setSystemVar 'PRIVATE_BINS' (resolvePath $BUILD_ROOT wrapping-bins)

$CommonPaths = "C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\Wbem;C:\WINDOWS\System32\WindowsPowerShell\v1.0"
$LocalNodePath = (resolvePath $WORKSPACE_ROOT node_modules\.bin)
$PythonPath = 'C:\Users\gongt\.windows-build-tools\python27'
setSystemVar 'PATH' "$PRIVATE_BINS;$NODEJS_BIN;$LocalNodePath;$PythonPath;$CommonPaths"

if ($env:KENDRYTE_PROXY) {
	setSystemVar 'HTTP_PROXY' "$env:KENDRYTE_PROXY"
}

if ($env:HTTP_PROXY) {
	setSystemVar 'HTTPS_PROXY' "$env:HTTP_PROXY"
	setSystemVar 'ALL_PROXY' "$env:HTTP_PROXY"
}

setSystemVar 'TMP' (resolvePath $BUILD_ROOT tmp)
setSystemVar 'TEMP' "${TMP}"

setSystemVar 'npm_config_arch' "x64"
setSystemVar 'npm_config_disturl' "https://atom.io/download/electron"
setSystemVar 'npm_config_runtime' "electron"
setSystemVar 'npm_config_cache' (resolvePath $TMP npm-cache)
