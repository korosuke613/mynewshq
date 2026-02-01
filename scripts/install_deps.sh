#!/bin/bash

# リモート環境（Web版Claude Code）でのみ実行
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

# Denoの依存関係をキャッシュ
deno cache --lock=deno.lock deno.json

exit 0
