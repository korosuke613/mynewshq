# 週次ワークフローのミュートフィルタ不適用バグ修正（Phase 2）

## 問題の再発見

Discussion #88でRDS記事が依然として表示されている。

## 調査結果

1. **フィルタスクリプトは正常に動作**
   - ログ: `aws: 40 -> 19 (21件ミュート除外)`
   - `-filtered.json`にRDS記事は含まれていない

2. **しかし、Claude Code Actionの出力にRDS記事が含まれている**
   - `summary-aws.json`の`categories`にRDS記事がある
   - Claude Code Actionが元のJSONを読んでいる可能性

## 根本原因

Claude Code Actionは`-filtered.json`を指定されていても、同じディレクトリにある元の`2026-01-28.json`も読める。AIがファイルを探索する際に、両方のファイルを見て元のJSONからデータを取得している。

## 解決策

**summarizeジョブで、Claude Code Action実行前に元のJSONを削除する**

これにより、Claude Code Actionが読めるファイルを`-filtered.json`のみに制限する。

## 実装計画

### Step 1: ワークフロー修正

**ファイル**: `.github/workflows/weekly-changelog.yml`

summarizeジョブの「Download changelog data」ステップの後に、元のJSONを削除するステップを追加:

```yaml
- name: Download changelog data
  if: steps.check.outputs.should_run == 'true'
  uses: actions/download-artifact@v4
  with:
    name: changelog-data
    path: data/

- name: Remove unfiltered JSON to prevent AI from reading it
  if: steps.check.outputs.should_run == 'true'
  run: |
    # Claude Code Actionが-filtered.jsonのみを読むよう、元のJSONを削除
    rm -f data/changelogs/weekly/${{ needs.fetch-data.outputs.end_date }}.json
    echo "Removed unfiltered JSON to ensure AI reads only filtered data"
```

## 変更対象ファイル

1. `.github/workflows/weekly-changelog.yml` (修正)

## 検証方法

1. ワークフローをworkflow_dispatchで実行
2. ログで「Removed unfiltered JSON」が表示されることを確認
3. 生成されたDiscussionにRDS記事が含まれていないことを確認

## リネームタスク

- [ ] 完了後、このプランファイルを `./plans/2026-01-28-fix-weekly-mute-filter-phase2.md` にリネーム
