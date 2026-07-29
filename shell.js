/* =========================================================================
   shell.js
   最上部の【顧客向けページ】⇔【管理者向けページ】切替と、
   管理者向けページ内の3タブ切替を制御する。
   ※通信・sessionStorage等の連携は一切行わず、iframeのsrcを
     切り替えるだけの見た目確認用スクリプトです。
   ========================================================================= */

const CUSTOMER_PAGES = [
  { key: "top",        label: "TOPページ",          file: "top/top.html" },
  { key: "dashboard",  label: "ダッシュボード",      file: "top/dashboard.html" },
  { key: "profinder",  label: "PROFiNDER",          file: "top/profinder.html" },
  { key: "inventory",  label: "在庫管理",            file: "top/inventory.html" },
  { key: "cashflow",   label: "キャッシュフロー管理", file: "top/cashflow.html" },
  { key: "resources",  label: "その他SLC関連",       file: "top/resources.html" },
  { key: "settings",   label: "設定",                file: "top/settings.html" }
];
const ADMIN_CONTENT_PAGE = "admin/admin-content.html";

let mode = "customer";       // "customer" | "admin"
let adminTab = "admin";      // "admin" | "demo" | "lookup"
let pickedPageKey = "top";
let lookupMemberNo = "";

const els = {};

function q(id){ return document.getElementById(id); }

function init(){
  els.frame = q("contentFrame");
  els.adminSubbar = q("adminSubbar");
  els.toolRow = q("toolRow");
  els.pagePicker = q("pagePicker");
  els.demoNote = q("demoNote");
  els.lookupForm = q("lookupForm");
  els.lookupInput = q("lookupMemberNo");
  els.lookupStatus = q("lookupStatus");

  q("modeCustomerBtn").addEventListener("click", function(){ setMode("customer"); });
  q("modeAdminBtn").addEventListener("click", function(){ setMode("admin"); });

  document.querySelectorAll(".admin-subtab").forEach(function(btn){
    btn.addEventListener("click", function(){ setAdminTab(btn.dataset.tab); });
  });

  renderPagePicker();

  els.lookupForm.addEventListener("submit", function(e){
    e.preventDefault();
    const value = els.lookupInput.value.trim();
    if(!value){
      els.lookupStatus.textContent = "会員番号を入力してください";
      els.lookupStatus.className = "lookup-status is-error";
      return;
    }
    lookupMemberNo = value;
    els.lookupStatus.textContent = "会員番号「" + value + "」で表示中（見た目確認のみ）";
    els.lookupStatus.className = "lookup-status is-active";
    updateFrame();
  });

  setMode("customer");
}

function setMode(next){
  mode = next;
  q("modeCustomerBtn").classList.toggle("active", mode === "customer");
  q("modeAdminBtn").classList.toggle("active", mode === "admin");
  els.adminSubbar.classList.toggle("hidden", mode !== "admin");
  if(mode === "admin"){
    setAdminTab(adminTab);
  }else{
    els.toolRow.classList.add("hidden");
    els.demoNote.classList.add("hidden");
    updateFrame();
  }
}

function setAdminTab(tab){
  adminTab = tab;
  document.querySelectorAll(".admin-subtab").forEach(function(btn){
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  const showToolRow = (tab === "demo" || tab === "lookup");
  els.toolRow.classList.toggle("hidden", !showToolRow);
  els.demoNote.classList.toggle("hidden", tab !== "demo" && tab !== "lookup");
  els.pagePicker.parentElement.style.display = showToolRow ? "" : "none";
  els.lookupForm.style.display = (tab === "lookup") ? "flex" : "none";

  if(tab === "demo"){
    q("demoNoteText").textContent = "特定の会員を指定せず、顧客ページ（①）の見た目をタブで確認できます。※見た目確認用の静的プレビューです。";
  }else if(tab === "lookup"){
    q("demoNoteText").textContent = "会員番号を入力すると、顧客ページ（①）をタブで確認できます。※見た目確認用の静的プレビューで、実データは切り替わりません。";
  }

  updateFrame();
}

function renderPagePicker(){
  els.pagePicker.innerHTML = "";
  CUSTOMER_PAGES.forEach(function(p){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill-btn" + (p.key === pickedPageKey ? " active" : "");
    btn.textContent = p.label;
    btn.addEventListener("click", function(){
      pickedPageKey = p.key;
      Array.from(els.pagePicker.children).forEach(function(c){ c.classList.remove("active"); });
      btn.classList.add("active");
      updateFrame();
    });
    els.pagePicker.appendChild(btn);
  });
}

function updateFrame(){
  if(mode === "customer"){
    els.frame.src = "top/top.html";
    return;
  }
  // mode === "admin"
  if(adminTab === "admin"){
    els.frame.src = ADMIN_CONTENT_PAGE;
    return;
  }
  if(adminTab === "demo"){
    const page = CUSTOMER_PAGES.find(function(p){ return p.key === pickedPageKey; }) || CUSTOMER_PAGES[0];
    els.frame.src = page.file;
    return;
  }
  if(adminTab === "lookup"){
    if(!lookupMemberNo){
      els.frame.removeAttribute("src");
      return;
    }
    const page = CUSTOMER_PAGES.find(function(p){ return p.key === pickedPageKey; }) || CUSTOMER_PAGES[0];
    els.frame.src = page.file;
    return;
  }
}

init();
