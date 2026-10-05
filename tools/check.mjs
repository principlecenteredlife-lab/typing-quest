// 安全装置: 自動変更が壊れていないか検証（CIで実行）
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
const root = path.resolve(import.meta.dirname, "..");
let fail = 0;
const ng = m => { console.error("NG:", m); fail++; };

// balance.json の範囲チェック
const b = JSON.parse(fs.readFileSync(path.join(root, "data/balance.json"), "utf8"));
for (const k of ["enemyHpMult", "enemyAtkMult", "attackIntervalMult", "goldMult"])
  if (!(b[k] >= 0.5 && b[k] <= 2)) ng(`balance.${k} が範囲外: ${b[k]}`);

// 単語リストチェック（ローマ字が a-z - , のみ）
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, "data/words.js"), "utf8"), ctx);
const words = ctx.window.WORDS.concat((ctx.window.EN_WORDS || []).map(([a, b]) => [a, b]));
if (!words || words.length < 20) ng("単語が少なすぎる");
for (const [jp, r] of words) if (!/^[a-z\-,.;\/]+$/.test(r)) ng(`不正なローマ字: ${jp} ${r}`);

// PWAのキャッシュ対象が実在するか
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
for (const f of JSON.parse(sw.match(/const FILES = (\[.*?\]);/)[1])) if (f !== "./" && !fs.existsSync(path.join(root, f))) ng(`sw.js のキャッシュ対象が無い: ${f}`);

// JS構文チェック
try { new vm.Script(fs.readFileSync(path.join(root, "game.js"), "utf8")); } catch (e) { ng("game.js 構文エラー: " + e.message); }

if (fail) process.exit(1);
console.log("all checks passed");
