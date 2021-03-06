#!/usr/bin/env bash
_PASSARG='"$@"'

function dieInstall() {
	die "\e[38;5;14;1mpython 2.x\e[38;5;9m is not installed on your system, install it first."
}
function diePermission() {
	die "You [$(whoami)]($(id -u)) do not have write permission to this dir: \n  $([[ -e "$1" ]] && ls -dlh "$1" || echo "$1")\nNeed run\n  \e[38;5;14msudo mkdir '$1' && sudo chown -R $(whoami) '$1'\e[0m"
}

MakeNewDir "$RELEASE_ROOT" || diePermission "$(dirname "$RELEASE_ROOT")"
MakeNewDir "$HOME" || diePermission "$(dirname "$HOME")"
MakeNewDir "$PRIVATE_BINS" || diePermission "$(dirname "$PRIVATE_BINS")"
MakeNewDir "$TMP" || diePermission "$(dirname "$TMP")"
MakeNewDir "$DOWNLOAD_PATH" || diePermission "$(dirname "$DOWNLOAD_PATH")"

export HISTFILE="$HOME/.bash_history"

if [ ! -e "$PRIVATE_BINS/node" ]; then
	echo "Install Node.js"

	VERSION="12.7.0"
	NEW_VERSION_SHORT="12"
	VERSION_OLD="10.16.0"
	OLD_VERSION_SHORT="10"
	if [ "$SYSTEM" = "linux" ]; then
		downloadFile "https://nodejs.org/dist/v${VERSION_OLD}/node-v${VERSION_OLD}-linux-x64.tar.xz" "$DOWNLOAD_PATH/node$OLD_VERSION_SHORT.tar.xz"
		downloadFile "https://nodejs.org/dist/v${VERSION}/node-v${VERSION}-linux-x64.tar.xz" "$DOWNLOAD_PATH/node$NEW_VERSION_SHORT.tar.xz"
	else
		downloadFile "https://nodejs.org/dist/v${VERSION_OLD}/node-v${VERSION_OLD}-darwin-x64.tar.xz" "$DOWNLOAD_PATH/node$OLD_VERSION_SHORT.tar.xz"
		downloadFile "https://nodejs.org/dist/v${VERSION}/node-v${VERSION}-darwin-x64.tar.xz" "$DOWNLOAD_PATH/node$NEW_VERSION_SHORT.tar.xz"
	fi
	echo "Extracting node from node.tar.xz to $NODEJS_INSTALL"
	RimDir "$NODEJS_INSTALL/node$OLD_VERSION_SHORT"
	RimDir "$NODEJS_INSTALL/node$NEW_VERSION_SHORT"
	MakeNewDir "$NODEJS_INSTALL/node$OLD_VERSION_SHORT"
	MakeNewDir "$NODEJS_INSTALL/node$NEW_VERSION_SHORT"

	tar xf "$DOWNLOAD_PATH/node$OLD_VERSION_SHORT.tar.xz" --strip-components 1 -C "$NODEJS_INSTALL/node$OLD_VERSION_SHORT"
	RimDir "$NODEJS_INSTALL/node$OLD_VERSION_SHORT/lib"
	RimDir "$NODEJS_INSTALL/node$OLD_VERSION_SHORT/bin/npm"
	RimDir "$NODEJS_INSTALL/node$OLD_VERSION_SHORT/bin/npx"

	tar xf "$DOWNLOAD_PATH/node.tar.xz" --strip-components 1 -C "$NODEJS_INSTALL/node$NEW_VERSION_SHORT"
	RimDir "$NODEJS_INSTALL/node$NEW_VERSION_SHORT/lib"
	RimDir "$NODEJS_INSTALL/node$NEW_VERSION_SHORT/bin/npm"
	RimDir "$NODEJS_INSTALL/node$NEW_VERSION_SHORT/bin/npx"

	writeShFile node "
		export PRIVATE_BINS='$PRIVATE_BINS'
		export VSCODE_ROOT='$VSCODE_ROOT'
		export MY_EXTENSION_ROOT='$MY_EXTENSION_ROOT'
		if pwd | grep -qE \"\$VSCODE_ROOT(/|$)\" \\
		|| pwd | grep -q \"\$RELEASE_ROOT\" \\
		|| pwd | grep -q \"\$MY_EXTENSION_ROOT\"
		then
			export NODEJS=\"$NODEJS_INSTALL/node$OLD_VERSION_SHORT/bin/node\"
			echo -e \"\e[38;5;8mUsing node $OLD_VERSION_SHORT in \$(pwd)\e[0m\" >&2
		else
			export NODEJS=\"$NODEJS_INSTALL/node$NEW_VERSION_SHORT/bin/node\"
			echo -e \"\e[38;5;8mUsing node $NEW_VERSION_SHORT in \$(pwd)\e[0m\" >&2
		fi
		export PATH=\"\$(dirname \"\$NODEJS\"):\$PATH\"
		\$NODEJS $_PASSARG
	"
fi

echo "Detect Node.js: $(cd "$VSCODE_ROOT" ; node --version)"
echo "Detect Node.js: $(node --version)"
export npm_config_target=$(cd "$VSCODE_ROOT" ; node -p "require('./build/lib/electron').getElectronVersion();" )

if [ ! -e "$PRIVATE_BINS/yarn" ]; then
	tempDir="$TMP/yarn-install"
	MakeNewDir "$tempDir"

	downloadFile "https://yarnpkg.com/latest.tar.gz" "$DOWNLOAD_PATH/yarn.tgz"

	echo "Extracting yarn..."
	cd "$tempDir"
	tar xf "$DOWNLOAD_PATH/yarn.tgz" --strip-components 1
	echo "Install yarn to $NODEJS_INSTALL"
	node ./bin/yarn.js \
			--prefer-offline --no-bin-links \
			--cache-folder "$YARN_CACHE_FOLDER" \
			--global-folder "$NODEJS_INSTALL" \
			--link-folder "$YARN_FOLDER" \
		global add yarn@latest
	cd "$RELEASE_ROOT"
	RimDir "$tempDir"
fi

### npm
writeShFile npm "
	exec node '$MY_SCRIPT_ROOT_BUILT/init-script/mock-npm.js' $_PASSARG
"
### npm

### yarn
writeShFile yarn "
	export npm_config_arch='$npm_config_arch'
	export npm_config_disturl='$npm_config_disturl'
	export npm_config_runtime='$npm_config_runtime'
	export npm_config_cache='$npm_config_cache'
	export npm_config_target='$npm_config_target'
	export VSCODE_ROOT='$VSCODE_ROOT'
	export YARN_FOLDER='$YARN_FOLDER'
	export YARN_CACHE_FOLDER='$YARN_CACHE_FOLDER'
	export PREFIX='$YARN_FOLDER'
	ARGS=($_PASSARG)
	if [ \${#ARGS[@]} -eq 0 ]; then
		ARGS+=('install')
	fi

	if echo $_PASSARG | grep -q -- --no-bin-links || echo $_PASSARG | grep -q -- --no-bin-links ; then
		BL=''
	else
		if [ \${ARGS[0]} = 'global' ]; then
			BL='--no-bin-links'
		else
			BL='--bin-links'
		fi
	fi

	exec node \\
		'$NODEJS_INSTALL/node_modules/yarn/bin/yarn.js' \\
			--prefer-offline \$BL \\
			--use-yarnrc '$VSCODE_ROOT/.yarnrc' \\
			--cache-folder '$YARN_CACHE_FOLDER' \\
			--global-folder '$NODEJS_INSTALL' \\
			--link-folder '$NODEJS_INSTALL\node_modules' \\
		\"\${ARGS[@]}\"
"
### yarn

### install node_modules for my scripts
if [ ! -e "$MY_SCRIPT_ROOT_BUILT" ]; then
	echo "init scripts..."
	cd "$WORKSPACE_ROOT"
	yarn global add node-gyp
	yarn
fi
### install node_modules for my scripts

function findCommand() {
	local PATH="${ORIGINAL_PATH}"
	command -v "$1"
}

echo -n "Detect Python: "
function tryPy(){
	local PATH="${ORIGINAL_PATH}"
	if "$1" -V 2>&1 | grep -q ' 2.' 2>/dev/null ; then
		[ -e "$PRIVATE_BINS/python" ] && unlink "$PRIVATE_BINS/python"
		ln -s "$(findCommand "$1")" "$PRIVATE_BINS/python"
		"$PRIVATE_BINS/python" -V
	fi
}
if [ "$SYSTEM" = "linux" ]; then
	tryPy python2 || tryPy python || die "python 2.x is not installed on your system, install it first."
else
	tryPy python || die "python 2.x is not installed on your system, install it first."
fi

echo -n "Detect Git: "
if ! findCommand "git" &>/dev/null ; then
	die "git is not installed on your system, install it first."
fi
writeShFile git "
	export HOME='${ORIGINAL_HOME}'
	export Path='${ORIGINAL_PATH}'
	'$(findCommand "git")' $_PASSARG
"
"$PRIVATE_BINS/git" --version

if ! findCommand "7z" &>/dev/null ; then
	if [ -z "$SYSTEM_COLLECTIONID" ]; then
		die "p7zip is not installed on your system, install it first."
	else
		if [ "$SYSTEM" = "mac" ]; then
			echo is mac
		else
			sudo apt-get install p7zip-full \
				bash wget curl tar findutils git make g++ libc++-dev libstdc++-5-dev libxss-dev gconf2 libx11-dev libxkbfile-dev
		fi
	fi
fi
writeShFile 7z "
	'$(findCommand "7z")' $_PASSARG
"
writeShFile sh "
	exec '/bin/bash' $_PASSARG
"
### x-www-browser
writeShFile x-www-browser "
echo -e \"\e[38;5;11mRequest to Start Browser: \$*\e[0m\"
# MSG=\"\$(echo \"\$*\" | sed -e 's/\\/\\\\/g' -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g')\"
# zenity --info --title='Request to Start Browser' --text=\"\$MSG\" --width=800 --height=240 &
"
### x-www-browser

if [ "$SYSTEM" = "mac" ]; then
	### mac gecho
	if [ -e "$PRIVATE_BINS/echo" ]; then
		unlink "$PRIVATE_BINS/echo"
	fi
	ln -s "$(which gecho)" "$PRIVATE_BINS/echo"
	### mac gecho

	export MAC_ECHO_BIN="$(which gecho)"
	function echo() {
		"$MAC_ECHO_BIN" "$@"
	}
	export -f echo
fi

cd $VSCODE_ROOT
