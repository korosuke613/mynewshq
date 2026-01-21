# データなしの場合にClaude Codeをスキップする

## 背景・問題

GitHub Actionsワークフローで以下の問題が発生:
- `fetch-changelogs.ts`はデータが空の場合`Deno.exit(0)`で終了し、**JSONファイルを出力しない**
- exit code 0は正常終了のため、ワークフローは次のステップ（Claude Code Action）に進む
- Claude Codeが起動されるが、読み込むべきJSONファイルがないため失敗
- 例: https://github.com/korosuke613/mynewshq/actions/runs/21199259993 (2025-12-25)

## 解決アプローチ

**方法A: ワークフローでJSONファイル存在チェックを追加**（推奨）

### 選定理由
1. 既存スクリプト`fetch-changelogs.ts`の挙動変更不要
2. ワークフロー内で完結する明示的な条件分岐
3. テスト変更不要

## 変更対象ファイル

1. `.github/workflows/daily-changelog.yml`
2. `.github/workflows/weekly-changelog.yml`

## 実装詳細

### daily-changelog.yml

**変更1**: 「Fetch changelogs」ステップにid追加、日付計算とファイル存在チェックを追加

```yaml
- name: Fetch changelogs
  id: fetch
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app-fetch.outputs.token }}
    MUTE_WORDS_ISSUE_NUMBER: "1"
  run: |
    if [ -n "${{ inputs.date }}" ]; then
      TARGET_DATE="${{ inputs.date }}"
      deno task fetch -- --date=${{ inputs.date }}
    else
      TARGET_DATE=$(date -u +%Y-%m-%d)
      deno task fetch
    fi
    echo "target_date=${TARGET_DATE}" >> $GITHUB_OUTPUT

    # ファイル存在確認
    if [ -f "data/changelogs/daily/${TARGET_DATE}.json" ]; then
      echo "has_data=true" >> $GITHUB_OUTPUT
      echo "Data file created: data/changelogs/daily/${TARGET_DATE}.json"
    else
      echo "has_data=false" >> $GITHUB_OUTPUT
      echo "No data file created (no updates found)"
    fi
```

**変更2**: 「Determine target date」ステップを削除（上記に統合）

**変更3**: 後続ステップに条件を追加
- 「Login GitHub App」に `if: steps.fetch.outputs.has_data == 'true'`
- 「Generate summaries with Claude Code」に `if: steps.fetch.outputs.has_data == 'true'`
- 「Post to Discussion」に `if: steps.fetch.outputs.has_data == 'true'`

**変更4**: promptとpostステップのdate参照を更新
- `${{ steps.target-date.outputs.date }}` → `${{ steps.fetch.outputs.target_date }}`

### weekly-changelog.yml

**変更1**: 「Fetch changelogs (7 days)」ステップにidとファイル存在チェックを追加

```yaml
- name: Fetch changelogs (7 days)
  id: fetch
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app-fetch.outputs.token }}
    MUTE_WORDS_ISSUE_NUMBER: "1"
  run: |
    deno task fetch --days=7 --weekly --date=${{ steps.target-date.outputs.end_date }}

    # ファイル存在確認
    if [ -f "data/changelogs/weekly/${{ steps.target-date.outputs.end_date }}.json" ]; then
      echo "has_data=true" >> $GITHUB_OUTPUT
      echo "Data file created"
    else
      echo "has_data=false" >> $GITHUB_OUTPUT
      echo "No data file created (no updates found)"
    fi
```

**変更2**: 後続ステップに条件を追加
- 「Login GitHub App」に `if: steps.fetch.outputs.has_data == 'true'`
- 「Generate summaries with Claude Code」に `if: steps.fetch.outputs.has_data == 'true'`
- 「Post to Discussion」に `if: steps.fetch.outputs.has_data == 'true'`

## 検証方法

1. 手動実行で過去のデータなし日付（例: 2025-12-25）を指定
   ```
   workflow_dispatch で date=2025-12-25 を入力
   ```
2. ワークフローログで以下を確認:
   - 「Fetch changelogs」ステップで「No data file created」が出力される
   - 後続ステップ（Claude Code, Post to Discussion）がスキップされる
   - ワークフロー全体が正常終了（緑チェック）

## TODO

- [ ] daily-changelog.yml を修正
- [ ] weekly-changelog.yml を修正
- [ ] 手動実行でデータなしケースをテスト
- [ ] プランファイルを `./plans/2026-01-21-skip-claude-code-on-empty-data.md` にリネーム
