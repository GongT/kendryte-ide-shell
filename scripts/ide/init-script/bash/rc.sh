#!/usr/bin/env bash

set -e

if [ -e "${ORIGINAL_HOME-$HOME}/.bashrc" ]; then
	source "${ORIGINAL_HOME-$HOME}/.bashrc" || {
			echo "Warning: can not load .bashrc"
		}
fi

MY_SCRIPT_INIT_FOLDER="$(dirname "$(realpath "${BASH_SOURCE[0]}")")"

cd "$MY_SCRIPT_INIT_FOLDER"
. fn.sh
cd "$MY_SCRIPT_INIT_FOLDER"
. env.sh

if [ -z "${AlreadyInited}" ]; then
	cd "$MY_SCRIPT_INIT_FOLDER"
	. init.sh
	cd "$MY_SCRIPT_INIT_FOLDER"
	. listcommands.sh

	export AlreadyInited=yes
fi

cd "${VSCODE_ROOT}"

if [ "$SYSTEM" = "mac" ]; then
	export _PROMPT_COLOR1=2
	export _PROMPT_COLOR2=6
else
	export _PROMPT_COLOR1=10
	export _PROMPT_COLOR2=14
fi

function prompt_path(){
	local PW="$1"
	if [[ "$PW" == "$VSCODE_ROOT" ]] ; then
		echo -e "[\[\e[38;5;${_PROMPT_COLOR2}m\]KendryteIDE\[\e[0m\]]$ "
	elif [[ "$PW" == "$VSCODE_ROOT/"* ]]; then
		echo -e "[\[\e[38;5;${_PROMPT_COLOR2}m\]KendryteIDE\[\e[0m\] $(basename "$PW")]$ "
	elif [[ "$PW" == "$WORKSPACE_ROOT" ]]; then
		echo -e "[\[\e[38;5;${_PROMPT_COLOR2}m\]Shell\[\e[0m\]]$ "
	elif [[ "$PW" == "$WORKSPACE_ROOT/"* ]]; then
		echo -e "[\[\e[38;5;${_PROMPT_COLOR2}m\]Shell\[\e[0m\] $(basename "$PW")]$ "
	else
		echo -e "[\[\e[38;5;${_PROMPT_COLOR1}m\]\u\[\e[0m\] $(basename "$1")]$ "
	fi
}
function prompt() {
	echo -en "\e]0;Kendryte IDE Source Code :: $(pwd)\007"
	export PS1="$(prompt_path "$(pwd)")"
}
export -f prompt_path
export -f prompt
export PROMPT_COMMAND="prompt"

if [ -z "${BS_RUN_SCRIPT}" ] || [ -n "$SYSTEM_COLLECTIONID" ] ; then
	echo -e "\ec"
	node "$MY_SCRIPT_ROOT_BUILT/init-script/help.js" -- --what-is-this
	echo
	echo -e "\e[38;5;10m > The anwser is 42 <\e[0m"
	echo
else
	echo "None-interactive mode detected. show-help will not run."
	echo
fi

cd "${VSCODE_ROOT}" # required last item
set +e
