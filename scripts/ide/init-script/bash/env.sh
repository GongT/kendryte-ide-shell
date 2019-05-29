#!/usr/bin/env bash

#function export() {
#	echo "export $*"
#	builtin export "$@"
#}
if [ -z "$ORIGINAL_HOME" ]; then
	export ORIGINAL_HOME="$HOME"
fi
if [ -z "$ORIGINAL_PATH" ]; then
	export ORIGINAL_PATH="$PATH"
fi

SCRIPT_LIB_ROOT=$(resolvePath "${BASH_SOURCE[0]}" ..)

if uname -o &>/dev/null ; then
	if [ "$(uname -o)" = "GNU/Linux" ]; then
		export SYSTEM=linux
	elif [ "$(uname -o)" = "Darwin" ]; then
		export SYSTEM=mac
	else
		die "Sorry, we do not support your platform: $(uname -a 2>&1)"
	fi
elif [ "$(uname 2>/dev/null)" = "Darwin" ]; then
	export SYSTEM=mac
else
	die "Sorry, we do not support your platform: $(uname -a 2>&1)"
fi

if [ "$(uname -m)" != "x86_64" ]; then
	die "Only support x86_64 platform."
fi


export WORKSPACE_ROOT="$(resolvePath "${SCRIPT_LIB_ROOT}" ../../../..)"
export MY_SCRIPT_ROOT="$(resolvePath "${WORKSPACE_ROOT}" scripts/ide)"
export VSCODE_ROOT="$(resolvePath "${WORKSPACE_ROOT}" ../kendryte-ide)"
export BUILD_ROOT="$(resolvePath "${WORKSPACE_ROOT}" build)"
export DEBUG_APP_ROOT="$(resolvePath "${BUILD_ROOT}" DebugContents)"
export LOCAL_PACKAGE_ROOT="$(resolvePath "${DEBUG_APP_ROOT}" LocalPackage)"
export VSCODE_PORTABLE="$(resolvePath "${DEBUG_APP_ROOT}" UserData/latest)"
export MY_SCRIPT_ROOT_BUILT="$(resolvePath "${BUILD_ROOT}" MyScriptBuildResult/ide)"
export DOWNLOAD_PATH="$(resolvePath "${BUILD_ROOT}" download)"
export RELEASE_ROOT="$(resolvePath "${BUILD_ROOT}" ide-main-release)"
export FAKE_HOME="$(resolvePath "${BUILD_ROOT}" FAKE_HOME)"
export HOME="${FAKE_HOME}"

export NODEJS_INSTALL="$(resolvePath "${BUILD_ROOT}" nodejs)"

export YARN_FOLDER="$(resolvePath "${BUILD_ROOT}" yarn)"
export PREFIX="$YARN_FOLDER"
export YARN_CACHE_FOLDER="$(resolvePath "${YARN_FOLDER}" cache)"

export PRIVATE_BINS="$(resolvePath "${BUILD_ROOT}" wrapping-bins)"
export NODEJS="$(resolvePath "${PRIVATE_BINS}" node)"

CommonPaths="/bin:/usr/bin"
if [ "$SYSTEM" = mac ]; then
	CommonPaths="/usr/local/opt/coreutils/libexec/gnubin:/usr/local/bin:${CommonPaths}"
fi
LocalNodePath="$(resolvePath "${WORKSPACE_ROOT}" node_modules/.bin)"
GlobalYarnPath="$(resolvePath "${BUILD_ROOT}" yarn/bin)"
ToolchainPath="$(resolvePath "${LOCAL_PACKAGE_ROOT}" toolchain/bin):$(resolvePath "${LOCAL_PACKAGE_ROOT}" cmake/bin)"
export PATH="$PRIVATE_BINS:$GlobalYarnPath:$LocalNodePath:$ToolchainPath:$CommonPaths"

if [ -n "$HTTP_PROXY" ] ; then
	export HTTPS_PROXY="$HTTP_PROXY"
	export ALL_PROXY="$HTTP_PROXY"
fi

export TMP="$(resolvePath "${BUILD_ROOT}" tmp)"
export TEMP="${TMP}"

export npm_config_arch="x64"
export npm_config_disturl="https://atom.io/download/electron"
export npm_config_runtime="electron"
export npm_config_cache="$(resolvePath "${TMP}" npm-cache)"
