// 回帰テスト: 仮想ブラウザ(jsdom)で実際にゲームを自動プレイし、クラッシュや進行不能を検出する
// 実行: npm install && node tools/playtest.mjs
import { JSDOM } from "jsdom";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const errors = [];
let fails = 0;
const expect = (cond, msg) => { if (!cond) { console.error("NG:", msg); fails++; } else console.log("OK:", msg); };

const dom = new JSDOM(read("index.html"), { runScripts: "outside-only", pretendToBeVisual: true, url: "http://localhost/" });
const w = dom.window;
w.addEventListener("error", e => errors.push(e.message));
w.fetch = () => Promise.reject(new Error("offline"));
w.eval(read("data/words.js"));
w.eval(read("game.js") + "\n;window.__t={get battle(){return battle},get S(){return S},startBattle,go};");
const T = w.__t;
const press = k => w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

function play(i, { english = false, missEvery = 0 } = {}) {
  T.startBattle(i, false, english);
  let n = 0, guard = 0;
  while (T.battle && guard++ < 20000) {
    const c = T.battle.word[1][T.battle.pos];
    if (missEvery && ++n % missEvery === 0) press(c === "z" ? "x" : "z");
    press(c);
  }
  return guard < 20000;
}

expect(play(0, { missEvery: 7 }), "ステージ1(日本語)を自動クリアできる");
expect(T.S.cleared >= 1 && T.S.gold > 0, "クリアで解放・報酬が付く");
expect(play(1, { english: true }), "ステージ2(英語モード)を自動クリアできる");
for (let i = 2; i < 10; i++) { T.S.cleared = i; expect(play(i), `ステージ${i + 1}がクリアできる(ボス含む)`); }
for (const s of ["analysis", "shop", "town"]) T.go(s);
expect((T.S.history || []).length >= 2, "プレイ履歴が記録される");
expect(errors.length === 0, "JSエラーが0件 " + errors.join("|"));
process.exit(fails ? 1 : 0);
