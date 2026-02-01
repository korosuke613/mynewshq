#!/bin/bash

set -exo pipefail

# リモート環境（Web版Claude Code）でのみ実行
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Denoのパスを設定
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# curlが未インストールの場合のみインストール
if ! command -v curl &> /dev/null; then
  apt-get update
  apt-get install -y curl
fi

# 7zipまたはunzipが未インストールの場合、unzipのみインストール
if ! command -v 7z &> /dev/null && ! command -v unzip &> /dev/null; then
  apt-get update
  apt-get install -y unzip
fi

# Denoが未インストールの場合のみインストール
if ! command -v deno &> /dev/null; then
  # 対話型プロンプトを抑制するためにCI=trueを設定
  curl -fsSL https://deno.land/install.sh | CI=true sh
fi

# 環境変数を永続化（後続のbashコマンドで使用可能に）
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "DENO_INSTALL=$DENO_INSTALL" >> "$CLAUDE_ENV_FILE"
  echo "PATH=$DENO_INSTALL/bin:\$PATH" >> "$CLAUDE_ENV_FILE"
fi

# deno.jsonが存在する場合のみ依存関係をキャッシュ
if [ -f "$CLAUDE_PROJECT_DIR/deno.json" ]; then
  "$DENO_INSTALL/bin/deno" cache "$CLAUDE_PROJECT_DIR/deno.json"
fi

exit 0
