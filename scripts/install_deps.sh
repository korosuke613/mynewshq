#!/bin/bash

# リモート環境（Web版Claude Code）でのみ実行
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Denoのパスを設定
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# Denoが未インストールの場合のみインストール
if ! command -v deno &> /dev/null; then
  curl -fsSL https://deno.land/install.sh | sh
fi

# 環境変数を永続化（後続のbashコマンドで使用可能に）
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "DENO_INSTALL=$DENO_INSTALL" >> "$CLAUDE_ENV_FILE"
  echo "PATH=$DENO_INSTALL/bin:\$PATH" >> "$CLAUDE_ENV_FILE"
fi

# deno.jsonが存在する場合のみ依存関係をキャッシュ
if [ -f "$CLAUDE_PROJECT_DIR/deno.json" ]; then
  deno cache "$CLAUDE_PROJECT_DIR/deno.json"
fi

exit 0
