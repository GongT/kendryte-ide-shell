#!/usr/bin/env bash

function show-help() {
	node "$MY_SCRIPT_ROOT_BUILT/init-script/help.js" -- --what-is-this "$@"
}

function fork() {
	echo "Only windows can open new window."
}

export -f fork

function d1 {
	cd "${VSCODE_ROOT}"
	echo "-> $(pwd)" >&2
}
export -f d1

function d2 {
	cd "${WORKSPACE_ROOT}"
	echo "-> $(pwd)" >&2
}
export -f d2

function fake-aws {
	export AWS_SECRET_ACCESS_KEY="fake"
	export AWS_REGION="cn-northwest-1"
	export AWS_ACCESS_KEY_ID="fake"
	export AWS_BUCKET="kendryte-ide"
	export CHANNEL=${1-"sourcecode"}
}
export -f fake-aws

