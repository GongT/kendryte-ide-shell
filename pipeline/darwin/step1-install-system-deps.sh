#!/usr/bin/env bash
if [ -n "$SKIP_DARWIN" ]; then
  exit 1
fi

echo PATH=$PATH
mkdir -p $HOME/bin
wget https://s3.cn-northwest-1.amazonaws.com.cn/kendryte-ide/3rd-party/7zip/7za -O $HOME/bin/7z
chmod a+x $HOME/bin/7z
