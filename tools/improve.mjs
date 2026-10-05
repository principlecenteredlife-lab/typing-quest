// 自律改善ループ: 匿名統計 -> 分析 -> balance.json を自動調整 -> レポート出力
// 使い方: node tools/improve.mjs   (data/telemetry/*.json を読む)
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const telDir = path.join(root, "data/telemetry");
const balPath = path.join(root, "data/balance.json");
const repDir = path.join(root, "data/reports");
fs.mkdirSync(telDir, { recursive: true });
fs.mkdirSync(repDir, { recursive: true });

const MIN_SAMPLES = 20;        // 1ステージあたりこの試行数が無いと調整しない（ノイズ対策）
const TARGET = [0.6, 0.85];    // 狙う勝率帯（楽しさと上達のバランス）
const STEP = 0.05;             // 1回の調整幅
const LIMIT = { min: 0.6, max: 1.6 }; // 暴走防止の上下限

const files = fs.readdirSync(telDir).filter(f => f.endsWith(".json"));
const data = files.map(f => { try { return JSON.parse(fs.readFileSync(path.join(telDir, f), "utf8")); } catch { return null; } }).filter(Boolean);

const bal = JSON.parse(fs.readFileSync(balPath, "utf8"));
const report = [`# 改善レポート ${new Date().toISOString().slice(0, 10)}`, `データ提供者数: ${data.length}`];

// 1) ステージ別勝率
const stages = {};
for (const d of data) for (const [i, s] of Object.entries(d.stageStats || {})) {
  const o = stages[i] || (stages[i] = { win: 0, lose: 0 });
  o.win += s.win || 0; o.lose += s.lose || 0;
}
let totWin = 0, totLose = 0;
report.push("\n## ステージ別勝率");
for (const [i, o] of Object.entries(stages)) {
  const n = o.win + o.lose; totWin += o.win; totLose += o.lose;
  report.push(`- ステージ${+i + 1}: ${(o.win / Math.max(n, 1) * 100).toFixed(0)}% (${n}戦)`);
}

// 2) 全体勝率に基づいてバランス調整（サンプル十分な場合のみ）
const total = totWin + totLose;
const clamp = v => Math.min(LIMIT.max, Math.max(LIMIT.min, +v.toFixed(2)));
if (total >= MIN_SAMPLES * 3) {
  const wr = totWin / total;
  if (wr < TARGET[0]) { // 難しすぎ -> 易しく
    bal.enemyAtkMult = clamp(bal.enemyAtkMult - STEP);
    bal.attackIntervalMult = clamp(bal.attackIntervalMult + STEP);
    report.push(`\n全体勝率 ${(wr * 100).toFixed(0)}% < ${TARGET[0] * 100}% → 敵の攻撃を弱体化`);
  } else if (wr > TARGET[1]) { // 簡単すぎ -> 難しく
    bal.enemyHpMult = clamp(bal.enemyHpMult + STEP);
    bal.attackIntervalMult = clamp(bal.attackIntervalMult - STEP);
    report.push(`\n全体勝率 ${(wr * 100).toFixed(0)}% > ${TARGET[1] * 100}% → 敵を強化`);
  } else report.push(`\n全体勝率 ${(wr * 100).toFixed(0)}% は適正。調整なし`);
  bal.version = (bal.version || 1) + 1;
  fs.writeFileSync(balPath, JSON.stringify(bal, null, 2) + "\n");
} else report.push(`\nサンプル不足(${total}戦 < ${MIN_SAMPLES * 3})のため調整せず`);

// 3) 全ユーザー共通の苦手キー -> 単語追加の提案
const keys = {};
for (const d of data) for (const [c, k] of Object.entries(d.keys || {})) {
  const o = keys[c] || (keys[c] = { n: 0, miss: 0 }); o.n += k.n; o.miss += k.miss;
}
const hard = Object.entries(keys).filter(([, k]) => k.n >= 50).map(([c, k]) => [c, k.miss / k.n]).sort((a, b) => b[1] - a[1]).slice(0, 5);
report.push("\n## 全体で苦手なキー（これを含む単語の追加を推奨）");
hard.forEach(([c, r]) => report.push(`- ${c}: ミス率 ${(r * 100).toFixed(1)}%`));
if (!hard.length) report.push("- データ不足");

fs.writeFileSync(path.join(repDir, "latest.md"), report.join("\n") + "\n");
console.log(report.join("\n"));
