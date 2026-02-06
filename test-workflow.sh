#!/bin/bash
set -e

# 色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# デフォルト値
CATEGORY="changelog"
DRY_RUN="--dry-run"
SKIP_FETCH=false
SKIP_SUMMARIZE=false
MODE="daily"  # daily or weekly
PROVIDER=""  # github, aws, claudeCode, linear

# ヘルプメッセージ
show_help() {
  cat << EOF
Usage: ./test-workflow.sh [OPTIONS]

完全なワークフロー（データ取得→要約生成→プレビュー→投稿）を一気通貫でテストします。

Options:
  --date=YYYY-MM-DD      対象日付（指定しない場合は今日）
  --category=TYPE        カテゴリ（changelog | blog）デフォルト: changelog
  --weekly               週次モード（デフォルト: 日次）
  --provider=PROVIDER    週次モード用プロバイダー
                         Changelog: github | aws | claudeCode | linear
                         Blog: hatenaBookmark | githubBlog | awsBlog
  --skip-fetch           データ取得をスキップ（既存データを使用）
  --skip-summarize       要約生成をスキップ
  --post                 dry-runなしで実際に投稿する（注意！）
  --help                 このヘルプを表示

Examples:
  # 日次: 今日のChangelogデータで一気通貫テスト
  ./test-workflow.sh

  # 日次: 特定日付のデータでテスト
  ./test-workflow.sh --date=2026-02-01

  # 日次: Blogデータでテスト
  ./test-workflow.sh --date=2026-02-01 --category=blog

  # 週次: GitHub Changelogデータでテスト（要約生成あり）
  ./test-workflow.sh --weekly --provider=github

  # 週次: AWS What's Newデータでテスト
  ./test-workflow.sh --weekly --provider=aws

  # 週次: Claude Codeデータでテスト
  ./test-workflow.sh --weekly --provider=claudeCode

  # 週次: はてなブックマークBlogデータでテスト
  ./test-workflow.sh --weekly --category=blog --provider=hatenaBookmark

  # 週次: GitHub Blogデータでテスト
  ./test-workflow.sh --weekly --category=blog --provider=githubBlog

  # 週次: AWS Blogデータでテスト
  ./test-workflow.sh --weekly --category=blog --provider=awsBlog

  # データ取得をスキップ（既存データを使用）
  ./test-workflow.sh --date=2026-02-01 --skip-fetch

  # 実際に投稿（dry-runなし、注意！）
  ./test-workflow.sh --date=2026-02-01 --post

EOF
}

# 引数解析
for arg in "$@"; do
  case $arg in
    --date=*)
      DATE="${arg#*=}"
      ;;
    --category=*)
      CATEGORY="${arg#*=}"
      ;;
    --weekly)
      MODE="weekly"
      ;;
    --provider=*)
      PROVIDER="${arg#*=}"
      ;;
    --skip-fetch)
      SKIP_FETCH=true
      ;;
    --skip-summarize)
      SKIP_SUMMARIZE=true
      ;;
    --post)
      DRY_RUN=""
      ;;
    --help)
      show_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      show_help
      exit 1
      ;;
  esac
done

# 日付が指定されていない場合は今日
if [ -z "$DATE" ]; then
  DATE=$(date +%Y-%m-%d)
fi

# 週次モードのバリデーション
if [ "$MODE" = "weekly" ]; then
  if [ -z "$PROVIDER" ]; then
    echo -e "${RED}Error: --provider is required for weekly mode${NC}"
    if [ "$CATEGORY" = "changelog" ]; then
      echo -e "${RED}Available providers: github, aws, claudeCode, linear${NC}"
    else
      echo -e "${RED}Available providers: hatenaBookmark, githubBlog, awsBlog${NC}"
    fi
    exit 1
  fi

  # プロバイダーとカテゴリの整合性チェック
  if [ "$CATEGORY" = "changelog" ]; then
    if [[ ! " github aws claudeCode linear " =~ " $PROVIDER " ]]; then
      echo -e "${RED}Error: Provider '$PROVIDER' is not valid for changelog category${NC}"
      echo -e "${RED}Available providers: github, aws, claudeCode, linear${NC}"
      exit 1
    fi
  else
    if [[ ! " hatenaBookmark githubBlog awsBlog " =~ " $PROVIDER " ]]; then
      echo -e "${RED}Error: Provider '$PROVIDER' is not valid for blog category${NC}"
      echo -e "${RED}Available providers: hatenaBookmark, githubBlog, awsBlog${NC}"
      exit 1
    fi
  fi
fi

# 一時ファイルパス
if [ "$MODE" = "weekly" ]; then
  SUMMARIES_FILE="/tmp/summaries-${DATE}-weekly-${PROVIDER}.json"
else
  SUMMARIES_FILE="/tmp/summaries-${DATE}-${MODE}-${CATEGORY}.json"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  完全ワークフロー動作確認${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📊 モード: ${GREEN}${MODE}${NC}"
echo -e "📅 日付: ${GREEN}${DATE}${NC}"
echo -e "📂 カテゴリ: ${GREEN}${CATEGORY}${NC}"
if [ "$MODE" = "weekly" ]; then
  echo -e "🔧 プロバイダー: ${GREEN}${PROVIDER}${NC}"
fi
if [ "$SKIP_SUMMARIZE" = false ]; then
  echo -e "📝 要約ファイル: ${GREEN}${SUMMARIES_FILE}${NC}"
else
  echo -e "⏭️  要約生成: ${YELLOW}スキップ${NC}"
fi
if [ -z "$DRY_RUN" ]; then
  echo -e "⚠️  ${YELLOW}実際に投稿します（dry-runなし）${NC}"
else
  echo -e "🧪 dry-runモード（投稿しません）"
fi
echo ""

# GitHub Token確認
if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${BLUE}[INFO]${NC} GitHub Tokenを取得中..."
  export GITHUB_TOKEN=$(gh auth token)
fi

# ステップ1: データ取得
if [ "$SKIP_FETCH" = true ]; then
  echo -e "${YELLOW}━━━ ステップ1: データ取得（スキップ） ━━━${NC}"
  echo -e "既存データを使用します"
else
  echo -e "${GREEN}━━━ ステップ1: データ取得 ━━━${NC}"
  if [ "$MODE" = "daily" ]; then
    # 日次モード
    if [ "$CATEGORY" = "changelog" ]; then
      GITHUB_TOKEN=$GITHUB_TOKEN deno task fetch --date=$DATE --category=changelog
    elif [ "$CATEGORY" = "blog" ]; then
      GITHUB_TOKEN=$GITHUB_TOKEN deno task fetch --date=$DATE --category=blog
    else
      echo -e "${RED}Invalid category: $CATEGORY${NC}"
      exit 1
    fi
  else
    # 週次モード
    if [ "$CATEGORY" = "changelog" ]; then
      GITHUB_TOKEN=$GITHUB_TOKEN deno task fetch-weekly
    elif [ "$CATEGORY" = "blog" ]; then
      GITHUB_TOKEN=$GITHUB_TOKEN deno task fetch-weekly-blog
    else
      echo -e "${RED}Invalid category: $CATEGORY${NC}"
      exit 1
    fi
  fi
fi
echo ""

# ステップ2: 要約生成
if [ "$SKIP_SUMMARIZE" = true ]; then
  echo -e "${YELLOW}━━━ ステップ2: 要約生成（スキップ） ━━━${NC}"
  echo -e "要約なしでプレビュー・投稿を実行します"
  echo ""
else
  echo -e "${GREEN}━━━ ステップ2: 要約生成（Claude Code CLI） ━━━${NC}"
  if [ "$MODE" = "weekly" ]; then
    # 週次モード: プロバイダーとカテゴリ指定
    deno task summarize --date=$DATE --category=$CATEGORY --weekly --provider=$PROVIDER --output=$SUMMARIES_FILE
  else
    # 日次モード
    deno task summarize --date=$DATE --category=$CATEGORY --output=$SUMMARIES_FILE
  fi
  echo ""

  # 生成されたJSONを表示
  echo -e "${GREEN}━━━ 生成された要約JSON ━━━${NC}"
  cat $SUMMARIES_FILE | jq .
  echo ""
fi

# ステップ3: プレビュー
echo -e "${GREEN}━━━ ステップ3: プレビュー ━━━${NC}"
if [ "$MODE" = "daily" ]; then
  # 日次モード
  if [ "$SKIP_SUMMARIZE" = false ]; then
    # 要約あり
    if [ "$CATEGORY" = "changelog" ]; then
      deno task preview --date=$DATE --summaries-file=$SUMMARIES_FILE
    elif [ "$CATEGORY" = "blog" ]; then
      deno task preview-blog --date=$DATE --summaries-file=$SUMMARIES_FILE
    fi
  else
    # 要約なし
    if [ "$CATEGORY" = "changelog" ]; then
      deno task preview --date=$DATE
    elif [ "$CATEGORY" = "blog" ]; then
      deno task preview-blog --date=$DATE
    fi
  fi
else
  # 週次モード
  if [ "$CATEGORY" = "changelog" ]; then
    if [ "$SKIP_SUMMARIZE" = false ]; then
      # 要約ありの週次Changelog（プロバイダー別）は未対応
      echo -e "${YELLOW}週次Changelogの要約ありプレビューは未対応${NC}"
      deno task preview-weekly
    else
      deno task preview-weekly
    fi
  elif [ "$CATEGORY" = "blog" ]; then
    if [ "$SKIP_SUMMARIZE" = false ]; then
      # 要約ありの週次Blog（プロバイダー別）は未対応
      echo -e "${YELLOW}週次Blogの要約ありプレビューは未対応${NC}"
      deno task preview-weekly-blog
    else
      deno task preview-weekly-blog
    fi
  fi
fi
echo ""

# ステップ4: 投稿
echo -e "${GREEN}━━━ ステップ4: 投稿 ${DRY_RUN:+(dry-run)} ━━━${NC}"
if [ -z "$DRY_RUN" ]; then
  echo -e "${YELLOW}⚠️  3秒後に実際に投稿します...（Ctrl+Cでキャンセル）${NC}"
  sleep 3
fi

if [ "$MODE" = "daily" ]; then
  # 日次モード
  if [ "$SKIP_SUMMARIZE" = false ]; then
    # 要約あり
    GITHUB_TOKEN=$GITHUB_TOKEN deno run --allow-read --allow-env scripts/create-discussion.ts \
      --category=$CATEGORY \
      --date=$DATE \
      --summaries-file=$SUMMARIES_FILE \
      $DRY_RUN \
      korosuke613 mynewshq
  else
    # 要約なし
    GITHUB_TOKEN=$GITHUB_TOKEN deno run --allow-read --allow-env scripts/create-discussion.ts \
      --category=$CATEGORY \
      --date=$DATE \
      $DRY_RUN \
      korosuke613 mynewshq
  fi
else
  # 週次モード
  echo -e "${YELLOW}週次モードでは投稿機能は未対応です${NC}"
  echo -e "${YELLOW}手動で以下のコマンドを実行してください:${NC}"
  echo -e "  ${GREEN}deno task preview-weekly${NC}  # プレビュー確認"
  if [ "$CATEGORY" = "changelog" ]; then
    echo -e "  ${GREEN}GITHUB_TOKEN=\$(gh auth token) deno task post-weekly-provider -- --provider=<provider>${NC}"
  elif [ "$CATEGORY" = "blog" ]; then
    echo -e "  ${GREEN}GITHUB_TOKEN=\$(gh auth token) deno task post-weekly-provider -- --provider=hatenaBookmark${NC}"
  fi
fi
echo ""

# 完了
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 完了！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
if [ "$SKIP_SUMMARIZE" = false ]; then
  echo -e "📄 要約ファイル: ${GREEN}${SUMMARIES_FILE}${NC}"
fi
echo -e "📄 プレビュー: ${GREEN}summary.md${NC}"
