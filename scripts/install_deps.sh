#!/bin/bash

# リモート環境（Web版Claude Code）でのみ実行
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Denoをインストール
curl -fsSL https://deno.land/install.sh | sh

# Denoのパスを通す
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# 環境変数を永続化（後続のbashコマンドで使用可能に）
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "DENO_INSTALL=$DENO_INSTALL" >> "$CLAUDE_ENV_FILE"
  echo "PATH=$DENO_INSTALL/bin:\$PATH" >> "$CLAUDE_ENV_FILE"
fi

# Denoの依存関係をキャッシュ
deno cache --lock=deno.lock deno.json

exit 0
