"use strict";
/* タイピングクエスト - ゲーム本体（フレームワーク不要・静的ホスティングで動作） */

// ---------- 定義 ----------
const ROWS = ["qwertyuiop", "asdfghjkl;", "zxcvbnm,./"].map(r => r.split(""));
const FINGER = {}; // キー -> 指
[["q","a","z"],["w","s","x"],["e","d","c"],["r","f","v","t","g","b"],[],[],["y","h","n","u","j","m"],["i","k",","],["o","l","."],["p",";","/"]]
  .forEach((keys, i) => keys.forEach(k => FINGER[k] = ["左小指","左薬指","左中指","左人差し指","","","右人差し指","右中指","右薬指","右小指"][i]));
const HOME = new Set(["f", "j"]);

const STAGES = [
  { name: "スライム", emoji: "🟢", hp: 20,  lvl: 1, atk: 2,  interval: 7000, gold: 15,  exp: 10 },
  { name: "ゴブリン", emoji: "👺", hp: 40,  lvl: 1, atk: 3,  interval: 6500, gold: 25,  exp: 18 },
  { name: "コウモリ", emoji: "🦇", hp: 60,  lvl: 2, atk: 4,  interval: 6000, gold: 40,  exp: 28 },
  { name: "オオカミ", emoji: "🐺", hp: 90,  lvl: 2, atk: 6,  interval: 5500, gold: 60,  exp: 40 },
  { name: "スケルトン", emoji: "💀", hp: 130, lvl: 3, atk: 8,  interval: 5500, gold: 90,  exp: 60 },
  { name: "ゴースト", emoji: "👻", hp: 180, lvl: 3, atk: 11, interval: 5000, gold: 130, exp: 85 },
  { name: "オーク",   emoji: "👹", hp: 250, lvl: 4, atk: 14, interval: 5000, gold: 190, exp: 120 },
  { name: "ゴーレム", emoji: "🗿", hp: 340, lvl: 4, atk: 18, interval: 4800, gold: 270, exp: 170 },
  { name: "ワイバーン", emoji: "🦎", hp: 450, lvl: 5, atk: 23, interval: 4500, gold: 380, exp: 240 },
  { name: "ドラゴン", emoji: "🐉", hp: 650, lvl: 5, atk: 30, interval: 4200, gold: 600, exp: 400 },
];
// エリアとストーリー（from = そのエリアの最初のステージ番号）
const AREAS = [
  { from: 0, name: "🌿 始まりの草原", story: "キーボードの勇者として旅立ったあなた。まずは草原のモンスターを倒し、ホームポジション(F・J)を体に覚えさせよう。" },
  { from: 3, name: "🕳️ 暗黒の洞窟", story: "洞窟の奥は暗く、手元は見えない…まさにブラインドタッチの修行場。画面を見たまま打て！" },
  { from: 6, name: "🏰 竜の城", story: "ついに竜の城へ。城の主ドラゴンを倒せば、真のタイピングマスターだ！" },
];
const areaOf = i => AREAS.filter(a => a.from <= i).pop();

const WEAPONS = [
  { name: "木の棒", atk: 1, price: 0 }, { name: "銅の剣", atk: 4, price: 80 }, { name: "鉄の剣", atk: 8, price: 300 },
  { name: "鋼の剣", atk: 13, price: 800 }, { name: "勇者の剣", atk: 20, price: 2000 },
];
const ARMORS = [
  { name: "布の服", def: 0, price: 0 }, { name: "革の鎧", def: 2, price: 70 }, { name: "鉄の鎧", def: 5, price: 280 },
  { name: "鋼の鎧", def: 9, price: 750 }, { name: "竜の鎧", def: 14, price: 1800 },
];

// ---------- 状態・保存 ----------
const SAVE_KEY = "typingquest.v1";
const defaultSave = () => ({ exp: 0, gold: 0, weapon: 0, armor: 0, cleared: 0, keys: {}, stageStats: {}, sessions: 0, history: [] });
let S = Object.assign(defaultSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify(S));
let B = { enemyHpMult: 1, enemyAtkMult: 1, attackIntervalMult: 1, goldMult: 1 };
fetch("data/balance.json").then(r => r.json()).then(j => { B = Object.assign(B, j); }).catch(() => {});

const $ = id => document.getElementById(id);

// 効果音（WebAudio。外部ファイル不要）
let audioCtx = null, muted = localStorage.getItem("typingquest.mute") === "1";
function beep(freq, dur = 0.06, type = "square", vol = 0.04) {
  if (muted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) { /* 音が出せない環境では無視 */ }
}
const SFX = {
  key: () => beep(660, 0.03), miss: () => beep(120, 0.12, "sawtooth"),
  hit: () => { beep(300, 0.08); setTimeout(() => beep(450, 0.1), 70); },
  hurt: () => beep(90, 0.25, "sawtooth", 0.06),
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, "triangle", 0.06), i * 120)),
};
const isBoss = i => i === 4 || i === 9;
const level = () => Math.floor(Math.sqrt(S.exp / 20)) + 1;
const maxHp = () => 30 + level() * 10;

// ---------- 画面 ----------
function go(name) {
  stopBattle();
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === name));
  if (name === "town") renderTown();
  if (name === "shop") renderShop();
  if (name === "analysis") renderAnalysis();
  renderStatus();
}
function renderStatus() {
  $("status").textContent = `Lv.${level()}  💰${S.gold}G  ⚔️${WEAPONS[S.weapon].name}  🛡️${ARMORS[S.armor].name}`;
}
document.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));

function renderTown() {
  $("stageList").innerHTML = "";
  STAGES.forEach((st, i) => {
    const area = AREAS.find(a => a.from === i);
    if (area) { const h = document.createElement("h3"); h.textContent = area.name; $("stageList").appendChild(h); }
    const locked = i > S.cleared;
    const d = document.createElement("div");
    d.className = "card" + (locked ? " locked" : "");
    const ss = S.stageStats[i] || { win: 0, lose: 0 };
    d.innerHTML = `<span>${st.emoji} ${isBoss(i) ? "👑" : ""}<b>${st.name}</b>（HP${Math.round(st.hp * B.enemyHpMult)} / 難易度${st.lvl}）勝${ss.win} 負${ss.lose}${i < S.cleared ? " ✅" : ""}</span>`;
    const b = document.createElement("button");
    b.textContent = locked ? "🔒" : "戦う";
    b.disabled = locked;
    b.onclick = () => startBattle(i);
    if (!locked) { const e = document.createElement("button"); e.textContent = "英語で戦う"; e.onclick = () => startBattle(i, false, true); d.appendChild(e); }
    d.appendChild(b);
    $("stageList").appendChild(d);
  });
}
$("weakTrain").onclick = () => startBattle(Math.min(S.cleared, STAGES.length - 1), true);

function renderShop() {
  const mk = (list, owned, key, stat, label) => {
    const box = $(key === "weapon" ? "weapons" : "armors");
    box.innerHTML = "";
    list.forEach((it, i) => {
      const d = document.createElement("div"); d.className = "card";
      d.innerHTML = `<span>${it.name}（${label}+${it[stat]}）${it.price}G</span>`;
      const b = document.createElement("button");
      if (i <= owned) { b.textContent = i === owned ? "装備中" : "所持"; b.disabled = true; }
      else {
        b.textContent = "買う"; b.disabled = S.gold < it.price || i > owned + 1;
        b.onclick = () => { S.gold -= it.price; S[key] = i; save(); renderShop(); renderStatus(); };
      }
      d.appendChild(b); box.appendChild(d);
    });
  };
  mk(WEAPONS, S.weapon, "weapon", "atk", "攻撃");
  mk(ARMORS, S.armor, "armor", "def", "防御");
}

// ---------- 戦闘 ----------
let battle = null;
function pickWord(lvl, weakMode, english) {
  if (english) { const p = EN_WORDS.filter(w => lvl <= 1 ? w[1].length <= 5 : lvl <= 2 ? w[1].length <= 7 : lvl <= 3 ? w[1].length <= 9 : true); return p[Math.floor(Math.random() * p.length)]; }
  const inLvl = w => { const n = w[1].length; return lvl === 1 ? n <= 5 : lvl === 2 ? n <= 7 : lvl === 3 ? n <= 9 : lvl === 4 ? n <= 12 : true; };
  let pool = WORDS.filter(inLvl);
  const weak = weakKeys();
  if (weakMode && weak.length) {
    const scored = WORDS.map(w => [w, [...w[1]].filter(c => weak.includes(c)).length / w[1].length]).sort((a, b) => b[1] - a[1]);
    pool = scored.slice(0, 12).map(x => x[0]);
  } else if (weak.length && Math.random() < 0.3) { // 通常戦闘でも30%は苦手キーを含む単語
    const wp = pool.filter(w => [...w[1]].some(c => weak.includes(c)));
    if (wp.length) pool = wp;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function startBattle(i, weakMode = false, english = false) {
  const st = STAGES[i];
  const hp = Math.round(st.hp * B.enemyHpMult);
  const boss = isBoss(i);
  battle = { i, st, weakMode, english, boss, eHp: hp, eMax: hp, pHp: maxHp(), pMax: maxHp(), combo: 0, maxCombo: 0, typed: 0, miss: 0, t0: performance.now(), lastT: 0, word: null, pos: 0 };
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "battle"));
  $("eName").textContent = `${st.emoji} ${st.name}`;
  $("enemy").textContent = st.emoji;
  $("enemy").style.fontSize = boss ? "130px" : "";
  const ar = areaOf(i), first = ar.from === i && !(S.stageStats[i] && S.stageStats[i].win);
  $("msg").textContent = first ? `${ar.name}：${ar.story}` : boss ? "👑 ボス戦！強敵が現れた！" : weakMode ? "苦手キー特訓！" : english ? "英単語バトル！" : "戦闘開始！";
  buildKbd();
  nextWord();
  const interval = st.interval * B.attackIntervalMult;
  battle.timer = setInterval(enemyAttack, interval);
  renderBattle();
}
function stopBattle() { if (battle) { clearInterval(battle.timer); battle = null; } }

function nextWord() {
  battle.word = pickWord(battle.st.lvl + (battle.boss ? 1 : 0), battle.weakMode, battle.english);
  battle.pos = 0; battle.lastT = 0;
  renderWord();
}
function renderWord() {
  const r = battle.word[1];
  $("jp").textContent = battle.word[0];
  $("romaji").innerHTML = [...r].map((c, k) => k < battle.pos ? `<span class="ok">${c}</span>` : k === battle.pos ? `<span class="cur">${c}</span>` : c).join("");
  document.querySelectorAll("#kbd .key").forEach(k => k.classList.toggle("next", k.dataset.k === r[battle.pos]));
}
function renderBattle() {
  $("pHpText").textContent = `HP ${battle.pHp}/${battle.pMax}`;
  $("eHpText").textContent = `HP ${Math.max(0, battle.eHp)}/${battle.eMax}`;
  $("pHp").style.width = Math.max(0, battle.pHp / battle.pMax * 100) + "%";
  $("eHp").style.width = Math.max(0, battle.eHp / battle.eMax * 100) + "%";
  $("combo").textContent = battle.combo > 1 ? `🔥 ${battle.combo} コンボ！` : "";
}
function buildKbd() {
  $("kbd").innerHTML = "";
  ROWS.forEach((row, ri) => {
    const d = document.createElement("div"); d.className = "krow"; d.style.marginLeft = ri * 14 + "px";
    row.forEach(k => { const e = document.createElement("div"); e.className = "key" + (HOME.has(k) ? " home" : ""); e.dataset.k = k; e.textContent = k; d.appendChild(e); });
    $("kbd").appendChild(d);
  });
}

function enemyAttack() {
  if (!battle) return;
  const dmg = Math.max(1, Math.round(battle.st.atk * B.enemyAtkMult) - ARMORS[S.armor].def);
  battle.pHp -= dmg; battle.combo = 0; SFX.hurt();
  $("msg").textContent = `${battle.st.name}の攻撃！ ${dmg}ダメージ`;
  renderBattle();
  if (battle.pHp <= 0) end(false);
}

function keyStat(c) { return S.keys[c] || (S.keys[c] = { n: 0, miss: 0, ms: 0, t: 0 }); }

document.addEventListener("keydown", e => {
  if (!battle) return;
  if (e.key === "Escape") { end(false, true); return; }
  if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  e.preventDefault();
  const c = e.key.toLowerCase(), want = battle.word[1][battle.pos], now = performance.now();
  const ks = keyStat(want);
  if (c === want) {
    ks.n++; SFX.key();
    if (battle.lastT) { ks.ms += now - battle.lastT; ks.t++; }
    battle.lastT = now; battle.pos++; battle.typed++; battle.combo++;
    battle.maxCombo = Math.max(battle.maxCombo, battle.combo);
    if (battle.pos >= battle.word[1].length) hitEnemy();
    else renderWord();
  } else {
    ks.n++; ks.miss++; battle.miss++; battle.combo = 0; SFX.miss();
    $("romaji").classList.add("miss"); setTimeout(() => $("romaji").classList.remove("miss"), 120);
  }
  if (battle) renderBattle();
});

function hitEnemy() {
  const len = battle.word[1].length;
  const dmg = Math.round((WEAPONS[S.weapon].atk + len) * (1 + Math.min(battle.combo, 40) * 0.03));
  battle.eHp -= dmg;
  $("msg").textContent = `${dmg}ダメージ！`;
  const en = $("enemy"); en.classList.remove("hit"); void en.offsetWidth; en.classList.add("hit"); SFX.hit();
  renderBattle();
  if (battle.eHp <= 0) end(true); else nextWord();
}
$("flee").onclick = () => end(false, true);

function end(win, fled = false) {
  const b = battle; stopBattle();
  const sec = (performance.now() - b.t0) / 1000;
  const wpm = Math.round(b.typed / 5 / (sec / 60));
  const acc = b.typed + b.miss ? Math.round(b.typed / (b.typed + b.miss) * 100) : 100;
  const ss = S.stageStats[b.i] || (S.stageStats[b.i] = { win: 0, lose: 0 });
  S.sessions++;
  (S.history = S.history || []).push({ wpm, acc, win }); S.history = S.history.slice(-30);
  let body = `<p>速度 ${wpm} WPM（5文字=1語換算） / 正確率 ${acc}% / 最大コンボ ${b.maxCombo}</p>`;
  if (win) {
    ss.win++;
    const gold = Math.round(b.st.gold * B.goldMult * (b.weakMode ? 0.5 : 1) * (b.boss ? 1.5 : 1)), exp = b.st.exp * (b.boss ? 2 : 1);
    const before = level(); S.gold += gold; S.exp += exp;
    if (b.i === S.cleared && !b.weakMode) S.cleared = Math.min(S.cleared + 1, STAGES.length);
    body += `<p>💰 ${gold}G と 経験値 ${exp} を獲得！${level() > before ? `<br>🎉 レベルアップ！ Lv.${level()}` : ""}</p>`;
    const na = AREAS.find(a => a.from === b.i + 1);
    if (na && !b.weakMode) body += `<p>📖 ${na.name} が解放された！</p>`;
    if (S.cleared >= STAGES.length) body += "<p>👑 全ステージ制覇！あなたは真のブラインドタッチ勇者だ！</p>";
  } else {
    if (!fled) ss.lose++;
    body += `<p>${fled ? "逃げ出した…" : "やられてしまった…"}　ミスの多かったキーを「分析」で確認して再挑戦しよう。</p>`;
  }
  save();
  if (win) SFX.win();
  $("resTitle").textContent = win ? "🎉 勝利！" : fled ? "撤退" : "💀 敗北";
  $("resBody").innerHTML = body;
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("active", s.id === "result"));
  renderStatus();
}

// ---------- 分析 ----------
const missRate = k => k.n ? k.miss / k.n : 0;
const avgMs = k => k.t ? k.ms / k.t : 0;
function weakKeys() {
  const arr = Object.entries(S.keys).filter(([, k]) => k.n >= 8);
  if (!arr.length) return [];
  const scored = arr.map(([c, k]) => [c, missRate(k) * 100 + avgMs(k) / 20]).sort((a, b) => b[1] - a[1]);
  return scored.slice(0, 5).filter(x => x[1] > 8).map(x => x[0]);
}
function renderHistory() {
  const h = S.history || [];
  if (h.length < 2) { $("history").innerHTML = ""; return; }
  const W = 600, H = 120, maxW = Math.max(30, ...h.map(x => x.wpm));
  const pts = (f, mx) => h.map((x, i) => `${(i / (h.length - 1) * (W - 20) + 10).toFixed(1)},${(H - 10 - f(x) / mx * (H - 20)).toFixed(1)}`).join(" ");
  $("history").innerHTML = `<h3>成長グラフ（直近${h.length}戦）</h3><svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#232852;border-radius:8px">
    <polyline fill="none" stroke="#3ecf6e" stroke-width="2" points="${pts(x => x.wpm, maxW)}"/>
    <polyline fill="none" stroke="#ffd866" stroke-width="2" points="${pts(x => x.acc, 100)}"/></svg>
    <p style="font-size:12px"><span style="color:#3ecf6e">━ 速度(WPM) 最大${maxW}</span>　<span style="color:#ffd866">━ 正確率(%)</span></p>`;
}
function renderAnalysis() {
  renderHistory();
  const keys = S.keys;
  const total = Object.values(keys).reduce((a, k) => a + k.n, 0);
  if (total < 30) {
    $("report").innerHTML = "<p>まだデータが足りません。何度か戦闘をしてから確認しよう！</p>";
    $("heat").innerHTML = ""; $("advice").innerHTML = ""; return;
  }
  // 指別集計
  const fing = {};
  for (const [c, k] of Object.entries(keys)) {
    const f = FINGER[c]; if (!f) continue;
    const o = fing[f] || (fing[f] = { n: 0, miss: 0, ms: 0, t: 0 });
    o.n += k.n; o.miss += k.miss; o.ms += k.ms; o.t += k.t;
  }
  let html = "<h3>指ごとの成績</h3><table><tr><th>指</th><th>ミス率</th><th>平均間隔</th></tr>";
  Object.entries(fing).sort((a, b) => missRate(b[1]) - missRate(a[1])).forEach(([f, o]) => {
    html += `<tr><td>${f}</td><td>${(missRate(o) * 100).toFixed(1)}%</td><td>${Math.round(avgMs(o))}ms</td></tr>`;
  });
  $("report").innerHTML = html + "</table>";

  // ヒートマップ
  $("heat").innerHTML = "<h3>キー別ヒートマップ（赤ほど苦手）</h3>";
  const maxScore = Math.max(1, ...Object.values(keys).map(k => missRate(k) * 100 + avgMs(k) / 20));
  ROWS.forEach((row, ri) => {
    const d = document.createElement("div"); d.className = "krow"; d.style.marginLeft = ri * 14 + "px";
    row.forEach(c => {
      const k = keys[c], e = document.createElement("div"); e.className = "key"; e.textContent = c;
      if (k && k.n >= 3) { const t = (missRate(k) * 100 + avgMs(k) / 20) / maxScore; e.style.background = `hsl(${120 - 120 * t},70%,55%)`; e.title = `ミス${k.miss}/${k.n} 平均${Math.round(avgMs(k))}ms`; }
      else e.style.background = "#555";
      d.appendChild(e);
    });
    $("heat").appendChild(d);
  });

  // アドバイス
  const adv = [];
  const weak = weakKeys();
  if (weak.length) adv.push(`苦手キー: <b>${weak.join(" ")}</b> → 「苦手キー特訓」で集中練習しよう。`);
  const fArr = Object.entries(fing).filter(([, o]) => o.n >= 20).sort((a, b) => missRate(b[1]) - missRate(a[1]));
  if (fArr.length && missRate(fArr[0][1]) > 0.06) adv.push(`<b>${fArr[0][0]}</b>のミスが多いです。その指が担当するキーの位置を意識し、正しい指を使っているか確認を。`);
  const L = Object.entries(fing).filter(([f]) => f.startsWith("左")), R = Object.entries(fing).filter(([f]) => f.startsWith("右"));
  const rate = a => { const n = a.reduce((s, [, o]) => s + o.n, 0), m = a.reduce((s, [, o]) => s + o.miss, 0); return n ? m / n : 0; };
  if (Math.abs(rate(L) - rate(R)) > 0.03) adv.push(`${rate(L) > rate(R) ? "左" : "右"}手のミスが多めです。弱い方の手を意識して練習しよう。`);
  const slow = Object.entries(keys).filter(([, k]) => k.t >= 5).sort((a, b) => avgMs(b[1]) - avgMs(a[1]))[0];
  if (slow && avgMs(slow[1]) > 600) adv.push(`「${slow[0]}」の入力が遅めです（平均${Math.round(avgMs(slow[1]))}ms）。位置を指に覚えさせよう。`);
  const rows = [0, 0, 0]; const rowN = [0, 0, 0];
  ROWS.forEach((r, i) => r.forEach(c => { if (keys[c]) { rows[i] += keys[c].miss; rowN[i] += keys[c].n; } }));
  const rr = rows.map((m, i) => rowN[i] ? m / rowN[i] : 0), worst = rr.indexOf(Math.max(...rr));
  if (rr[worst] > 0.06) adv.push(`${["上段","ホームポジション段","下段"][worst]}のミス率が高めです。`);
  if (!adv.length) adv.push("素晴らしい！大きな弱点は見つかりません。上位ステージに挑戦しよう。");
  $("advice").innerHTML = adv.map(a => `<li>${a}</li>`).join("");
}

// 任意共有: 個人情報を含まない統計のみ。tools/improve.mjs が読み込める形式
$("exportBtn").onclick = () => {
  const payload = { v: 1, keys: S.keys, stageStats: S.stageStats, level: level(), sessions: S.sessions };
  navigator.clipboard.writeText(JSON.stringify(payload)).then(() => alert("コピーしました。GitHubのIssue（telemetryラベル）に貼り付けると、サービス改善に使われます。"));
};
$("resetBtn").onclick = () => { if (confirm("すべてのデータを消去しますか？")) { S = defaultSave(); save(); if (window.matchMedia && matchMedia("(pointer: coarse)").matches) $("touchNote").style.display = "block";
go("town"); } };

if (window.matchMedia && matchMedia("(pointer: coarse)").matches) $("touchNote").style.display = "block";
go("town");

// ミュート切替
const muteBtn = $("muteBtn");
const showMute = () => muteBtn.textContent = muted ? "🔇 音OFF" : "🔊 音ON";
muteBtn.onclick = () => { muted = !muted; localStorage.setItem("typingquest.mute", muted ? "1" : "0"); showMute(); };
showMute();
