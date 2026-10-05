// 戦闘中は広告を出さない（街・ショップ・分析画面の下部のみ）
(function () {
  const A = window.ADS || {};
  if (!A.client || !A.slot) return;
  const s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + A.client;
  document.head.appendChild(s);
  const box = document.getElementById("adBox");
  box.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${A.client}" data-ad-slot="${A.slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  (window.adsbygoogle = window.adsbygoogle || []).push({});
  const sync = () => { box.style.display = document.getElementById("battle").classList.contains("active") ? "none" : "block"; };
  new MutationObserver(sync).observe(document.querySelector("main"), { subtree: true, attributes: true, attributeFilter: ["class"] });
  sync();
})();