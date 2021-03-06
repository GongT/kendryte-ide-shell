#!/usr/bin/env bash
set -e

function die() {
	echo -en "\e[38;5;9m" >&2
	echo -en "$*" >&2
	echo -e "\e[0m" >&2
	exit 1
}

if [ -z "$SYSTEM_COLLECTIONID" ]; then
	if [ -z "${BASH_SOURCE[0]}" ]; then
		die "Your bash is too old to run this. consider system upgrade."
	fi
	if [ "$(id -u)" -eq 0 ]; then
		die "Do not use root."
	fi
	
	sh --version &>/dev/null || {
		ls -l /bin
		sh --version || die "Your 'sh' is missing, please create link (eg: ln -s bash /bin/sh)."
	}
	sh --version 2>&1 | grep -q "bash" || {
		ls -l /bin
		sh --version || die "Your sh is not a standard BASH, that is not supported."
	}
fi

if [ $# -eq 0 ]; then
	export BS_RUN_SCRIPT=""
	bash --rcfile "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/ide/init-script/bash/rc.sh" || {
		RET=$?
		if [ $RET -eq 0 ]; then
			exit 0
		fi
		
		echo -e "\n  \e[38;5;9mCommand failed with error $RET.\e[0m" >&2
		exit $RET
	}
else
	export BS_RUN_SCRIPT=YES
	source "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/ide/init-script/bash/rc.sh"
	
	"$@" || die "Command failed with error $RET"
fi
