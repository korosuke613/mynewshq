# workflow_dispatch時のDiscussionカテゴリ変更

## 概要

workflow_dispatch（手動実行）時は `manual trigger` カテゴリに、スケジュール実行時は既存カテゴリ（Daily/Weekly）に投稿するよう変更する。

## 変更ファイル

### 1. `.github/workflows/daily-changelog.yml`

4箇所のカテゴリ指定を動的に変更:

| 行 | 変更前 | 変更後 |
|----|--------|--------|
| 124 | `Daily` | `${{ github.event_name == 'workflow_dispatch' && 'manual trigger' \|\| 'Daily' }}` |
| 127 | `Daily` | `${{ github.event_name == 'workflow_dispatch' && 'manual trigger' \|\| 'Daily' }}` |
| 173 | `Daily` | `${{ github.event_name == 'workflow_dispatch' && 'manual trigger' \|\| 'Daily' }}` |
| 176 | `Daily` | `${{ github.event_name == 'workflow_dispatch' && 'manual trigger' \|\| 'Daily' }}` |

### 2. `.github/workflows/weekly-changelog.yml`

行318-321の `deno task post-weekly-all` コマンドに `--category` オプションを追加:

```yaml
deno task post-weekly-all \
  --date=${{ needs.fetch-data.outputs.end_date }} \
  --changelog-file=data/changelogs/weekly/${{ needs.fetch-data.outputs.end_date }}.json \
  --summaries-file=/tmp/all-summaries.json \
  --category="${{ github.event_name == 'workflow_dispatch' && 'manual trigger' || 'Weekly' }}"
```

## 前提条件

- リポジトリに `manual trigger` カテゴリが存在すること
- カテゴリが存在しない場合、`create-discussion.ts` がエラーを出力する

## 検証方法

1. **YAML構文チェック**: ワークフローファイルの構文エラーがないことを確認
2. **手動実行テスト**: GitHub Actionsから workflow_dispatch で実行し、`manual trigger` カテゴリに投稿されることを確認
3. **（任意）スケジュール実行確認**: 次回スケジュール実行時に既存カテゴリ（Daily/Weekly）に投稿されることを確認

## TODO

- [x] `manual trigger` カテゴリの存在確認 → 存在する
- [ ] daily-changelog.yml の4箇所を変更
- [ ] weekly-changelog.yml の1箇所を変更
- [ ] 手動実行でテスト
- [ ] プランファイルを `./plans/2026-01-28-workflow-dispatch-category.md` にリネーム
