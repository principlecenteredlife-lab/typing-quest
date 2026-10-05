# 公開手順（約10分・すべて無料）

この PC には Git が未インストールです。先に https://git-scm.com/download/win からインストールし、このフォルダで次を実行してください。
```r
git init -b main
git add -A
git commit -m "Initial commit"
```

## 1. GitHub にリポジトリを作る
1. https://github.com/new で、リポジトリ名 `typing-quest`、**Public** で作成（READMEなし）
2. このフォルダで実行:
```
git remote add origin https://github.com/<あなたのID>/typing-quest.git
git branch -M main
git push -u origin main
```

## 2. 無料公開（GitHub Pages）
Settings > Pages > Source を **GitHub Actions** に変更。push のたびに自動でテスト→公開されます。
公開URL: `https://<あなたのID>.github.io/typing-quest/`

## 3. 自律改善ループを有効にする
1. Issues に `telemetry` ラベルを作成（Labels > New label）
2. Settings > Actions > General > Workflow permissions を **Read and write** にし、
   **Allow GitHub Actions to create and approve pull requests** にチェック
3. 以後、毎週月曜に自動でプルリクエストが届きます。内容（`data/reports/latest.md`）を見てマージするだけ。
   すぐ試すには Actions タブ > weekly-self-improve > Run workflow

## 4. index.html のリンク修正
`index.html` の末尾の `repoLink`（改善提案はこちら）を、自分のリポジトリの Issues URL に変えてください。

## 運用メモ
- 単語追加は `data/words.js`、敵やアイテムは `game.js` の定義部分を編集
- 変更後は `npm install && npm test` で自動テスト
