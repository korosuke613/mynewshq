# 日次ワークフローのカテゴリ選択機能追加

## 概要

`daily-changelog.yml` の `workflow_dispatch` 実行時に、処理対象（changelog/blog）を boolean で選択可能にする。
週次ワークフローと同じパターンを採用し、GitHub Actions の `case` 関数で簡潔に実装する。

## 変更対象ファイル

- `.github/workflows/daily-changelog.yml`

## 変更内容

### 1. workflow_dispatch inputs に boolean を追加

```yaml
workflow_dispatch:
  inputs:
    date:
      description: "対象日付 (YYYY-MM-DD形式、空欄で今日)"
      required: false
      type: string
    run_changelog:
      description: "Changelogを実行"
      required: false
      type: boolean
      default: true
    run_blog:
      description: "Blogを実行"
      required: false
      type: boolean
      default: true
```

### 2. fetch ステップの変更（case関数を使用）

`case` 関数でカテゴリを決定：

```yaml
- name: Fetch changelogs and blogs
  id: fetch
  env:
    GITHUB_TOKEN: ${{ steps.login-gh-app-fetch.outputs.token }}
    MUTE_WORDS_ISSUE_NUMBER: "1"
    CATEGORY_CONFIG_ISSUE_NUMBER: "104"
    CATEGORY_FILTER_ISSUE_NUMBER: "118"
    # case関数でカテゴリを決定（schedule時はinputsが空なのでall）
    CATEGORY: |-
      ${{ case(
        inputs.run_changelog != false && inputs.run_blog != false, 'all',
        inputs.run_changelog != false, 'changelog',
        inputs.run_blog != false, 'blog',
        'none'
      ) }}
  run: |
    if [ "$CATEGORY" = "none" ]; then
      echo "No category selected, skipping fetch"
      echo "has_changelog=false" >> $GITHUB_OUTPUT
      echo "has_blog=false" >> $GITHUB_OUTPUT
      exit 0
    fi

    if [ -n "${{ inputs.date }}" ]; then
      TARGET_DATE="${{ inputs.date }}"
      deno task fetch -- --date=${{ inputs.date }} --category=${CATEGORY}
    else
      TARGET_DATE=$(date -u +%Y-%m-%d)
      deno task fetch -- --category=${CATEGORY}
    fi
    echo "target_date=${TARGET_DATE}" >> $GITHUB_OUTPUT

    # ファイル存在確認（選択されたカテゴリのみ）
    if [ "$CATEGORY" = "all" ] || [ "$CATEGORY" = "changelog" ]; then
      [ -f "data/changelogs/daily/${TARGET_DATE}.json" ] && echo "has_changelog=true" >> $GITHUB_OUTPUT || echo "has_changelog=false" >> $GITHUB_OUTPUT
    else
      echo "has_changelog=false" >> $GITHUB_OUTPUT
    fi

    if [ "$CATEGORY" = "all" ] || [ "$CATEGORY" = "blog" ]; then
      [ -f "data/blogs/daily/${TARGET_DATE}.json" ] && echo "has_blog=true" >> $GITHUB_OUTPUT || echo "has_blog=false" >> $GITHUB_OUTPUT
    else
      echo "has_blog=false" >> $GITHUB_OUTPUT
    fi
```

**ポイント**:
- `inputs.run_changelog != false` で schedule 時（inputs が空）も true として扱う
- `case` 関数で環境変数 `CATEGORY` を設定し、シェルスクリプトを簡潔に

### 3. 後続ステップ

変更不要。既存の `has_changelog` / `has_blog` 出力で制御される。

## 動作仕様

| 実行方法 | run_changelog | run_blog | CATEGORY | 処理対象 |
|----------|---------------|----------|----------|----------|
| schedule | (空→true) | (空→true) | all | 両方 |
| workflow_dispatch | true | true | all | 両方 |
| workflow_dispatch | true | false | changelog | Changelog のみ |
| workflow_dispatch | false | true | blog | Blog のみ |
| workflow_dispatch | false | false | none | なし（早期終了） |

## 検証方法

1. workflow_dispatch で各組み合わせを選択して実行
2. 選択したカテゴリのみが処理されることを確認
3. schedule実行で従来通り両方処理されることを確認

## プランファイルのリネーム

実装完了後: `plans/2026-02-01-daily-workflow-category-selection.md`
