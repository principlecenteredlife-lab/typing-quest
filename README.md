# タイピングクエスト

無料・登録不要のブラインドタッチ練習RPG。敵を倒してゴールドを稼ぎ、武器防具を買って奥地へ。苦手キーを自動分析。

## 遊ぶ
`index.html` をブラウザで開くだけ（`npx serve .` だとバランス自動調整も反映）。

## 無料公開
GitHubにpush → Settings > Pages > Source: GitHub Actions。`pages.yml` が自動デプロイ。サーバー費用ゼロ。

## 自律改善の仕組み
1. プレイヤーが「分析」画面の匿名統計を Issue（ラベル `telemetry`）に任意で投稿
2. 毎週 `improve.yml` が取り込み → `tools/improve.mjs` が勝率を分析し `data/balance.json` を自動調整、`data/reports/latest.md` を生成
3. `tools/check.mjs` で検証に通った場合のみ Pull Request を自動作成 → 人間が確認してマージ
4. マージで自動デプロイ

調整は狙い勝率帯60〜85%、1回±5%、上下限付きで暴走しません。

## 今後の拡張アイデア
- 単語追加（`data/words.js`）、ボス、ストーリー、英文・プログラミングコード練習
- 広告/寄付（Ko-fi等）で起業の収益化、有料の追加コンテンツ
