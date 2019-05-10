#!/usr/bin/env bash

if [[ "$(id -u)" -eq 0 ]]; then
	echo -e "\e[38;5;9mYou are not allowed to run this app with root permissions.\e[0m" >&2
	exit 1
fi

exec "$(dirname "${BASH_SOURCE[0]}")/Updater/electron" "$@"
