/* =========================================================================
   admin-common.js（開発環境・見た目確認用）
   ※本番のログイン/セッション/API等には一切接続していません。
     プレビュータブを押すと、iframeの表示先を切り替えるだけの
     見た目確認用スクリプトです。
   ========================================================================= */

/* 顧客ページ(①)側で参照しているページ一覧。プレビュー切り替えタブ共通で使用 */
const CUSTOMER_PAGES = [
  { key: "top",        label: "TOPページ",        file: "top.html" },
  { key: "dashboard",  label: "ダッシュボード",    file: "dashboard.html" },
  { key: "profinder",  label: "PROFiNDER",        file: "profinder.html" },
  { key: "inventory",  label: "在庫管理",          file: "inventory.html" },
  { key: "cashflow",   label: "キャッシュフロー管理", file: "cashflow.html" },
  { key: "resources",  label: "その他SLC関連",     file: "resources.html" },
  { key: "settings",   label: "設定",              file: "settings.html" }
];

/* プレビュータブ(pill-group)を生成する共通関数 */
function renderPreviewTabs(container, activeKey, onSelect){
  container.innerHTML = "";
  CUSTOMER_PAGES.forEach(function(p){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn" + (p.key === activeKey ? " active" : "");
    btn.textContent = p.label;
    btn.addEventListener("click", function(){
      Array.from(container.children).forEach(function(c){ c.classList.remove("active"); });
      btn.classList.add("active");
      onSelect(p);
    });
    container.appendChild(btn);
  });
}
