#!/usr/bin/env bash

cd "$MY_SCRIPT_ROOT_BUILT/commands"
LSDIR=($(ls | grep -E "\.ts$"))
for i in "${LSDIR[@]}" ; do
	Command="${i%.ts}"

	writeShFile "$Command" "
		function die() {
			echo -en \"\e[38;5;9m\" >&2
			echo -en \"\$*\" >&2
			echo -e \"\e[0m\" >&2
			exit 1
		}
		cd '$MY_SCRIPT_ROOT_BUILT'
		node 'init-script/load-command.js' '${Command}' \"\$@\" || die \"Command failed with code \$?\"
	"
done

writeShFile show-help "
	cd '$MY_SCRIPT_ROOT_BUILT'
	
	exec node 'init-script/help.js' -- --what-is-this
"

function fork() {
	echo "Only windows can open new window."
}

export -f fork