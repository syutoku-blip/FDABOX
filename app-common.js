/* =========================================================================
   app-common.js
   SHiFT リサーチ探求サイト - 共通ユーティリティ (top.html / mypage.html で使用)
   ログイン処理(login.js)や GAS 通信ロジックはここには含まれません。
   ========================================================================= */

const SESSION_KEY = "shift_session";
// ダミー環境のためGASバックエンドへの通信は行わない(意図的に無効なURLにしている)
const GAS_WEB_APP_URL = "";

/* ---------- ダミーデータ(見た目確認用) ---------- */
const DUMMY_RELATION_ITEMS = [
  {"ASIN":"B0DEMO0001","ブランド":"サンプルブランドA","カテゴリ":"キッチン用品","30日販売数":128,"出品セラー数":6,"推奨仕入れ数":12,"日本仕入JPY":1580,"売値USD":24.99,"TWAP":26.10,"想定送料JPY":420,"想定関税JPY":80,"AMZ想定手数料JPY":610,"入金額予想JPY":2980,"利益期待値JPY":890},
  {"ASIN":"B0DEMO0002","ブランド":"サンプルブランドB","カテゴリ":"文房具","30日販売数":64,"出品セラー数":3,"推奨仕入れ数":8,"日本仕入JPY":890,"売値USD":15.50,"TWAP":16.20,"想定送料JPY":260,"想定関税JPY":40,"AMZ想定手数料JPY":380,"入金額予想JPY":1720,"利益期待値JPY":410},
  {"ASIN":"B0DEMO0003","ブランド":"サンプルブランドC","カテゴリ":"おもちゃ","30日販売数":210,"出品セラー数":9,"推奨仕入れ数":20,"日本仕入JPY":2400,"売値USD":38.00,"TWAP":39.50,"想定送料JPY":540,"想定関税JPY":120,"AMZ想定手数料JPY":920,"入金額予想JPY":4520,"利益期待値JPY":1180}
];
const DUMMY_OVERLAY_ITEMS = [
  {"ASIN":"B0DEMO1001","ブランド":"サンプルブランドD","カテゴリ":"日用品","黒字化％":72,"赤字化％":8,"ボラティリティ指数":14.2,"バンド指数":61,"30日販売数":95,"出品セラー数":5,"推奨仕入れ数":10,"日本仕入JPY":1200,"売値USD":19.80,"想定送料JPY":320,"想定関税JPY":60,"AMZ手数料JPY":470,"入金額予想JPY":2210,"利益期待値JPY":560},
  {"ASIN":"B0DEMO1002","ブランド":"サンプルブランドE","カテゴリ":"アウトドア","黒字化％":58,"赤字化％":15,"ボラティリティ指数":21.5,"バンド指数":44,"30日販売数":47,"出品セラー数":4,"推奨仕入れ数":6,"日本仕入JPY":3100,"売値USD":52.00,"想定送料JPY":680,"想定関税JPY":190,"AMZ手数料JPY":1240,"入金額予想JPY":5980,"利益期待値JPY":1350}
];

/* ---------- セッション管理 ---------- */
function getSession(){
  try{
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  }catch(e){
    return null;
  }
}
function saveSession(session){
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}
function buildDummySession(){
  return {
    memberNo: "DEMO",
    relationItems: DUMMY_RELATION_ITEMS,
    overlayItems: DUMMY_OVERLAY_ITEMS,
    relationUpdatedDate: "2026/07/29",
    overlayUpdatedDate: "2026/07/29",
    loginAt: Date.now()
  };
}
// ログイン画面を廃止したため、未ログインでも自動でダミーセッションを発行してそのまま利用する。
function requireSession(){
  let session = getSession();
  if(!session || !session.memberNo){
    session = buildDummySession();
    saveSession(session);
  }
  return session;
}
function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "top.html";
}
function applyUserChip(session){
  const el = document.getElementById("currentUserChip");
  if(el && session) el.textContent = session.memberNo;
}

/* ---------- ローディング表示 ---------- */
function showLoading(text="処理中です"){
  const overlay=document.getElementById("loadingOverlay");
  if(!overlay)return;
  document.getElementById("loadingText").innerText=text;
  overlay.classList.add("active");
}
function hideLoading(){
  const overlay=document.getElementById("loadingOverlay");
  if(overlay)overlay.classList.remove("active");
}

/* ---------- 汎用ユーティリティ ---------- */
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}

/* ---------- コピー用トースト通知 ---------- */
function copyTextToClipboard(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);return new Promise((resolve,reject)=>{try{const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand("copy");document.body.removeChild(ta);ok?resolve():reject()}catch(e){reject(e)}})}
let copyToastTimer=null;
function showCopyToast(message){const toast=document.getElementById("copyToast");if(!toast)return;toast.textContent=message;toast.classList.add("visible");clearTimeout(copyToastTimer);copyToastTimer=setTimeout(()=>{toast.classList.remove("visible")},2200)}


/* ---------- お知らせ (TOPページ) ---------- */
const ANNOUNCE_TAG_PALETTE = [
  {bg:"rgba(224,41,63,.10)",fg:"#c62a44"},
  {bg:"rgba(246,168,33,.14)",fg:"#a8650a"},
  {bg:"rgba(255,106,61,.12)",fg:"#e2531f"},
  {bg:"rgba(26,156,90,.10)",fg:"#1a9c5a"},
  {bg:"rgba(15,157,143,.12)",fg:"#0b7568"},
  {bg:"rgba(192,57,155,.12)",fg:"#932b76"}
];
const ANNOUNCE_TAG_ALERT_COLOR={bg:"rgba(224,41,63,.14)",fg:"#c62a44"};
const ANNOUNCE_TAG_ALERT_NAMES=["個別案内","緊急"];
function tagColor(tag){
  const text=String(tag||"").trim();
  if(ANNOUNCE_TAG_ALERT_NAMES.includes(text))return ANNOUNCE_TAG_ALERT_COLOR;
  if(!text)return ANNOUNCE_TAG_PALETTE[2];
  let hash=0;for(let i=0;i<text.length;i++){hash=(hash*31+text.charCodeAt(i))>>>0}
  return ANNOUNCE_TAG_PALETTE[hash%ANNOUNCE_TAG_PALETTE.length];
}
let ANNOUNCEMENTS_PROMISE = null;
const ANNOUNCEMENTS_JSON_PATH = "announcements.json";
function fetchAnnouncements(){
  if(ANNOUNCEMENTS_PROMISE)return ANNOUNCEMENTS_PROMISE;
  ANNOUNCEMENTS_PROMISE=(async()=>{
    // 1) まず静的JSON（GitHub側で自動更新される想定）を試す。速い。
    try{
      const res=await fetch(`${ANNOUNCEMENTS_JSON_PATH}?t=${Date.now()}`,{cache:"no-store"});
      if(res.ok){
        const data=await res.json();
        if(data&&Array.isArray(data.announcements))return data.announcements;
      }
    }catch(e){/* 静的JSONが無い/失敗した場合はGASにフォールバック */}
    // 2) フォールバック：GAS経由で取得（多少ラグがある）
    try{
      const controller=(typeof AbortController!=="undefined")?new AbortController():null;
      const timer=controller?setTimeout(()=>controller.abort(),7000):null;
      const res=await fetch(GAS_WEB_APP_URL,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"announcements"}),
        signal:controller?controller.signal:undefined
      });
      if(timer)clearTimeout(timer);
      const data=await res.json();
      return (data&&data.success&&Array.isArray(data.announcements))?data.announcements:[];
    }catch(e){
      return [];
    }
  })();
  return ANNOUNCEMENTS_PROMISE;
}
function buildAnnouncementItem(item,idPrefix,index){
  const color=tagColor(item.tag);
  const tagHtml=item.tag?`<span class="announce-badge" style="background:${color.bg};color:${color.fg}">${escapeHtml(item.tag)}</span>`:`<span class="announce-badge">お知らせ</span>`;
  const contentId=`${idPrefix}-content-${index}`;
  return `<div class="announce-item">
    <div class="announce-item-date">${escapeHtml(item.date||"")}</div>
    ${tagHtml}
    <button type="button" class="announce-title-btn" aria-expanded="false" aria-controls="${contentId}" onclick="toggleAnnouncement(this)"><span>${escapeHtml(item.title||"(無題)")}</span></button>
    <div class="announce-content hidden" id="${contentId}">${escapeHtml(item.body||"")}</div>
  </div>`;
}
function toggleAnnouncement(btn){
  const contentId=btn.getAttribute("aria-controls");
  const content=document.getElementById(contentId);
  if(!content)return;
  const willShow=content.classList.contains("hidden");
  content.classList.toggle("hidden",!willShow);
  btn.setAttribute("aria-expanded",String(willShow));
  btn.classList.toggle("is-open",willShow);
}
// お知らせの対象者(target)が空なら全員、記入があれば該当会員番号のみに表示する。
// カンマ区切り・改行区切りどちらでも入力できるように解釈する。
function isAnnouncementForMember(target,memberNo){
  const text=String(target||"").trim();
  if(!text)return true; // 未記入なら全員に表示
  const list=text.split(/[\n,、，]+/).map(v=>v.trim()).filter(Boolean);
  if(!list.length)return true;
  return list.includes(String(memberNo||"").trim());
}
function filterAnnouncementsForCurrentMember(items){
  const session=getSession();
  const memberNo=session?session.memberNo:"";
  return items.filter(item=>isAnnouncementForMember(item.target,memberNo));
}
async function renderTopAnnouncements(){
  const listEl=document.getElementById("announceList");
  if(!listEl)return;
  const items=filterAnnouncementsForCurrentMember(await fetchAnnouncements());
  if(!items.length){listEl.innerHTML='<div class="notify-text" style="padding:4px 0">現在お知らせはありません。</div>';return}
  listEl.innerHTML=items.slice(0,5).map((item,i)=>buildAnnouncementItem(item,"top",i)).join("");
  const moreBtn=document.getElementById("announceMoreBtn");
  if(moreBtn)moreBtn.classList.toggle("hidden",items.length<=5);
}
async function openAnnouncementModal(){
  const modal=document.getElementById("announceModal");
  const listEl=document.getElementById("announceModalList");
  if(!modal||!listEl)return;
  modal.classList.add("visible");
  document.body.style.overflow="hidden";
  listEl.innerHTML='<div class="notify-text" style="padding:8px 0">読み込み中です...</div>';
  const items=filterAnnouncementsForCurrentMember(await fetchAnnouncements());
  if(!items.length){listEl.innerHTML='<div class="notify-text" style="padding:8px 0">現在お知らせはありません。</div>';return}
  listEl.innerHTML=items.map((item,i)=>buildAnnouncementItem(item,"modal",i)).join("");
}
function closeAnnouncementModal(){
  const modal=document.getElementById("announceModal");
  if(!modal)return;
  modal.classList.remove("visible");
  document.body.style.overflow="";
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAnnouncementModal()});

/* ---------- その他SLC関連 (マニュアル・フォーム) ---------- */
let SLC_LINKS_PROMISE = null;
const SLC_LINKS_JSON_PATH = "slc-links.json";
function fetchSlcLinks(){
  if(SLC_LINKS_PROMISE)return SLC_LINKS_PROMISE;
  SLC_LINKS_PROMISE=(async()=>{
    // 1) まず静的JSON（GitHub側で手動公開時に更新される想定）を試す。速い。
    try{
      const res=await fetch(`${SLC_LINKS_JSON_PATH}?t=${Date.now()}`,{cache:"no-store"});
      if(res.ok){
        const data=await res.json();
        if(data&&(Array.isArray(data.manuals)||Array.isArray(data.forms))){
          return {manuals:Array.isArray(data.manuals)?data.manuals:[],forms:Array.isArray(data.forms)?data.forms:[]};
        }
      }
    }catch(e){/* 静的JSONが無い/失敗した場合はGASにフォールバック */}
    // 2) フォールバック：GAS経由で取得
    try{
      const controller=(typeof AbortController!=="undefined")?new AbortController():null;
      const timer=controller?setTimeout(()=>controller.abort(),7000):null;
      const res=await fetch(GAS_WEB_APP_URL,{
        method:"POST",
        headers:{"Content-Type":"text/plain;charset=utf-8"},
        body:JSON.stringify({action:"slcLinks"}),
        signal:controller?controller.signal:undefined
      });
      if(timer)clearTimeout(timer);
      const data=await res.json();
      if(data&&data.success){
        return {manuals:Array.isArray(data.manuals)?data.manuals:[],forms:Array.isArray(data.forms)?data.forms:[]};
      }
      return {manuals:[],forms:[]};
    }catch(e){
      return {manuals:[],forms:[]};
    }
  })();
  return SLC_LINKS_PROMISE;
}
function buildResourceTile(item,kind){
  const safeLink=escapeHtml(item.link||"#");
  const icon=kind==="manual"
    ? '<path d="M4 4h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="12" y2="16"></line>'
    : '<rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><path d="M9 17l1.5 1.5L14 15"></path>';
  const accent=kind==="manual"?"#2f5fe0":"#1a9c5a";
  const descHtml=item.summary?`<div class="shop-tile-desc">${escapeHtml(item.summary)}</div>`:"";
  const hasLink=!!(item.link&&item.link.trim());
  const tag=hasLink?"a":"div";
  const linkAttrs=hasLink?`href="${safeLink}" target="_blank" rel="noopener"`:"";
  return `<${tag} class="shop-tile" style="--tile-accent:${accent}" ${linkAttrs}>
    <div class="shop-tile-icon"><svg viewBox="0 0 24 24">${icon}</svg></div>
    <div class="shop-tile-name">${escapeHtml(item.title||"(無題)")}</div>
    ${descHtml}
    ${hasLink?`<div class="shop-tile-cta">開く<svg viewBox="0 0 24 24"><path d="M7 17L17 7M7 7h10v10"></path></svg></div>`:""}
  </${tag}>`;
}
async function renderSlcLinks(){
  const manualList=document.getElementById("manualList");
  const formList=document.getElementById("formList");
  if(!manualList&&!formList)return;
  const {manuals,forms}=await fetchSlcLinks();
  if(manualList){
    manualList.innerHTML=manuals.length
      ? manuals.map(m=>buildResourceTile(m,"manual")).join("")
      : '<div class="notify-text" style="padding:4px 0">現在マニュアルはありません。</div>';
  }
  if(formList){
    formList.innerHTML=forms.length
      ? forms.map(f=>buildResourceTile(f,"form")).join("")
      : '<div class="notify-text" style="padding:4px 0">現在フォームはありません。</div>';
  }
}

/* ---------- 時間帯に応じた挨拶文・背景色 (TOPページ) ---------- */
function getTimePeriod(){
  const hour=new Date().getHours();
  if(hour>=5&&hour<11)return "morning";
  if(hour>=11&&hour<18)return "day";
  return "night";
}
function getTimeGreeting(){
  const period=getTimePeriod();
  if(period==="morning")return "おはようございます";
  if(period==="day")return "こんにちは";
  return "こんばんは";
}
function applyTopbarTimeClass(){
  const bar=document.querySelector(".main-topbar");
  if(bar)bar.classList.add("time-"+getTimePeriod());
}

/* ---------- サブメニュー連結用の接続バー位置調整（新規リサーチの下位タブ：三角を pf-nested-tabs 側に付ける） ---------- */
function updateSubNavConnector(){
  const nested=document.querySelector(".pf-nested-tabs");
  const activeLink=document.getElementById("pfNewresearchTab");
  if(!nested||!activeLink)return;
  const nestedRect=nested.getBoundingClientRect();
  const linkRect=activeLink.getBoundingClientRect();
  const left=linkRect.left-nestedRect.left+linkRect.width/2-9; // 矢印の中心をボタン中央に合わせる(border幅9pxぶん調整)
  nested.style.setProperty("--tail-left",Math.round(left)+"px");
}
window.addEventListener("resize",updateSubNavConnector);
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",updateSubNavConnector)}else{updateSubNavConnector()}
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(updateSubNavConnector).catch(()=>{})}
[100,400,1000].forEach(ms=>setTimeout(updateSubNavConnector,ms));

/* =========================================================================
   表示設定 / 通知設定 (設定ページ) — localStorage に保存し全ページへ反映
   ========================================================================= */
const DISPLAY_PREFS_KEY = "shift_display_prefs";
const NOTIFY_PREFS_KEY = "shift_notify_prefs";

function getDisplayPrefs(){
  try{
    return Object.assign({theme:"light",fontsize:"medium",tone:"default"}, JSON.parse(localStorage.getItem(DISPLAY_PREFS_KEY)||"{}"));
  }catch(e){
    return {theme:"light",fontsize:"medium",tone:"default"};
  }
}
function saveDisplayPrefs(prefs){
  localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(prefs));
  applyDisplayPrefs();
}
// 全ページの <head> 内で即時実行し、画面のちらつきを防ぐ(style.css読込前でも属性だけは設定される)
function applyDisplayPrefs(){
  const p = getDisplayPrefs();
  const h = document.documentElement;
  h.setAttribute("data-theme", p.theme || "light");
  h.setAttribute("data-fontsize", p.fontsize || "medium");
  h.setAttribute("data-tone", p.tone || "default");
}

function getNotifyPrefs(){
  try{
    return Object.assign({announceOn:true,notifyOn:true}, JSON.parse(localStorage.getItem(NOTIFY_PREFS_KEY)||"{}"));
  }catch(e){
    return {announceOn:true,notifyOn:true};
  }
}
function saveNotifyPrefs(prefs){
  localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(prefs));
}

/* ---------- 設定ページ (settings.html) 専用ロジック ---------- */
function initSettingsPage(){
  const dp = getDisplayPrefs();
  const np = getNotifyPrefs();

  document.querySelectorAll("[data-fontsize-option]").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.fontsizeOption === dp.fontsize);
    btn.addEventListener("click", ()=>{
      const next = getDisplayPrefs(); next.fontsize = btn.dataset.fontsizeOption;
      saveDisplayPrefs(next);
      document.querySelectorAll("[data-fontsize-option]").forEach(b=>b.classList.toggle("active", b===btn));
      flashSettingsSaved();
    });
  });

  document.querySelectorAll("[data-theme-option]").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.themeOption === dp.theme);
    btn.addEventListener("click", ()=>{
      const next = getDisplayPrefs(); next.theme = btn.dataset.themeOption;
      saveDisplayPrefs(next);
      document.querySelectorAll("[data-theme-option]").forEach(b=>b.classList.toggle("active", b===btn));
      flashSettingsSaved();
    });
  });

  document.querySelectorAll(".tone-swatch").forEach(sw=>{
    sw.classList.toggle("active", sw.dataset.tone === dp.tone);
    sw.addEventListener("click", ()=>{
      const next = getDisplayPrefs(); next.tone = sw.dataset.tone;
      saveDisplayPrefs(next);
      document.querySelectorAll(".tone-swatch").forEach(s=>s.classList.toggle("active", s===sw));
      flashSettingsSaved();
    });
  });

  const announceToggle = document.getElementById("announceToggle");
  const notifyToggle = document.getElementById("notifyToggle");
  if(announceToggle){
    announceToggle.classList.toggle("on", !!np.announceOn);
    announceToggle.addEventListener("click", ()=>{
      const next = getNotifyPrefs(); next.announceOn = !next.announceOn;
      saveNotifyPrefs(next);
      announceToggle.classList.toggle("on", next.announceOn);
      flashSettingsSaved();
    });
  }
  if(notifyToggle){
    notifyToggle.classList.toggle("on", !!np.notifyOn);
    notifyToggle.addEventListener("click", ()=>{
      const next = getNotifyPrefs(); next.notifyOn = !next.notifyOn;
      saveNotifyPrefs(next);
      notifyToggle.classList.toggle("on", next.notifyOn);
      flashSettingsSaved();
    });
  }
}
let settingsSavedTimer=null;
function flashSettingsSaved(){
  const note=document.getElementById("settingsSavedNote");
  if(!note)return;
  note.classList.add("visible");
  clearTimeout(settingsSavedTimer);
  settingsSavedTimer=setTimeout(()=>note.classList.remove("visible"),1600);
}

/* ---------- ダッシュボード(概況)ページ用: 目標値設定 ---------- */
const GOAL_PREFS_KEY = "shift_goal_prefs";
function getGoalPrefs(){
  try{ return Object.assign({revenueGoal:0,profitGoal:0}, JSON.parse(localStorage.getItem(GOAL_PREFS_KEY)||"{}")); }
  catch(e){ return {revenueGoal:0,profitGoal:0}; }
}
function saveGoalPrefs(prefs){ localStorage.setItem(GOAL_PREFS_KEY, JSON.stringify(prefs)); }

/* ---------- ProFinderへ直接タブを開いた状態で遷移する(ダッシュボードのアクションボタン用) ---------- */
function goToProfinder(openKey){
  window.location.href = "profinder.html?open=" + encodeURIComponent(openKey);
}

/* =========================================================================
   トップバーの通知ドロップダウン（お知らせモーダルとは別の「通知」専用UI）
   ========================================================================= */
function renderTopbarNotify(session){
  const list = document.getElementById("topbarNotifyList");
  const dot = document.getElementById("topbarNotifyDot");
  if(!list || !session) return;
  const relCount = Array.isArray(session.relationItems) ? session.relationItems.length : 0;
  const ovCount = Array.isArray(session.overlayItems) ? session.overlayItems.length : 0;
  const items = [];
  if(relCount) items.push({text:`リレーションのASINが${relCount}件更新されました`, time:session.relationUpdatedDate});
  if(ovCount) items.push({text:`オーバーレイのASINが${ovCount}件更新されました`, time:session.overlayUpdatedDate});
  if(dot) dot.style.display = items.length ? "" : "none";
  if(!items.length){
    list.innerHTML = '<div class="notify-text" style="padding:12px 16px">現在、新しい通知はありません</div>';
    return;
  }
  list.innerHTML = items.map(it=>`<div class="topbar-notify-item"><span class="notify-dot"></span><div><div class="notify-text">${it.text}</div><div class="notify-time">${it.time}</div></div></div>`).join("");
}
/* 汎用：ドロップダウン/メニューをボタンの近くに position:fixed で配置する（全ページ共通）
   文字サイズ設定(body{zoom})の影響を受けるページがあるため、その分を補正して座標を計算する */
function shiftPositionFixedPanel(panel,btn){
  const rect=btn.getBoundingClientRect();
  const margin=12;
  const zoom=parseFloat(getComputedStyle(document.body).zoom)||1;
  let x=rect.right/zoom-panel.offsetWidth;
  let y=(rect.bottom+8)/zoom;
  const maxX=(window.innerWidth-panel.offsetWidth-margin)/zoom;
  if(x>maxX)x=Math.max(margin,maxX);
  if(x<margin)x=margin;
  const maxY=(window.innerHeight-panel.offsetHeight-margin)/zoom;
  if(y>maxY)y=Math.max(margin,maxY);
  panel.style.left=x+"px";
  panel.style.top=y+"px";
}
function toggleTopbarNotify(evt){
  if(evt) evt.stopPropagation();
  const panel = document.getElementById("topbarNotifyPanel");
  if(!panel) return;
  // main-topbarにisolation:isolateが設定されており、position:fixedにしただけでは
  // そのスタッキングコンテキストから抜け出せず、下のセクションに隠れてしまうため、
  // 初回表示時にbody直下へ移動させて完全に切り離す
  if(panel.parentElement!==document.body)document.body.appendChild(panel);
  const willOpen = panel.classList.contains("hidden");
  document.querySelectorAll(".topbar-notify-panel").forEach(p=>p.classList.add("hidden"));
  if(willOpen){
    panel.classList.remove("hidden");
    const btn=evt&&evt.currentTarget;
    if(btn)shiftPositionFixedPanel(panel,btn);
  }
}
document.addEventListener("click",(e)=>{
  if(!e.target.closest(".topbar-notify-wrap")){
    document.querySelectorAll(".topbar-notify-panel").forEach(p=>p.classList.add("hidden"));
  }
});

/* ---------- サイドバーの折りたたみ ---------- */
function toggleSidebar(){
  const h = document.documentElement;
  const collapsed = h.getAttribute("data-sidebar") === "collapsed";
  const next = collapsed ? "expanded" : "collapsed";
  h.setAttribute("data-sidebar", next);
  try{ localStorage.setItem("shift_sidebar_collapsed", next); }catch(e){}
  updateSidebarReopenTab();
}
function hideSidebarFully(){
  const h = document.documentElement;
  h.setAttribute("data-sidebar", "hidden");
  try{ localStorage.setItem("shift_sidebar_collapsed", "hidden"); }catch(e){}
  updateSidebarReopenTab();
}
function updateSidebarReopenTab(){
  let tab = document.getElementById("sidebarReopenTab");
  if(!tab){
    tab = document.createElement("button");
    tab.type = "button";
    tab.id = "sidebarReopenTab";
    tab.className = "sidebar-reopen-tab";
    tab.setAttribute("aria-label", "サイドバーを表示する");
    tab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"></path></svg>';
    tab.addEventListener("click", function(){
      document.documentElement.setAttribute("data-sidebar", "expanded");
      try{ localStorage.setItem("shift_sidebar_collapsed", "expanded"); }catch(e){}
      updateSidebarReopenTab();
    });
    document.body.appendChild(tab);
  }
  const hidden = document.documentElement.getAttribute("data-sidebar") === "hidden";
  tab.classList.toggle("visible", hidden);
}
document.addEventListener("DOMContentLoaded", updateSidebarReopenTab);

/* ---------- 使い方ガイド モーダル ---------- */
function openHelpModal(){
  const modal=document.getElementById("helpModal");
  if(!modal)return;
  modal.classList.add("visible");
  document.body.style.overflow="hidden";
  // モーダルは常にバックグラウンドでアニメーションが進行しているため、開くたびに最初(カーソルの待機位置)から再生し直す
  modal.querySelectorAll(".help-cursor,.help-click-ripple,.help-info-popup").forEach(el=>{
    el.style.animation="none";
    void el.offsetWidth; // 強制リフローでアニメーションをリセット
    el.style.animation="";
  });
}
function closeHelpModal(){
  const modal=document.getElementById("helpModal");
  if(!modal)return;
  modal.classList.remove("visible");
  document.body.style.overflow="";
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeHelpModal()});

/* =========================================================================
   チュートリアル（初回ログイン時の使い方ガイド：PROFiNDER編）
   TOPページに来た時点で自動的に始まる（「初回かどうか」は会員管理シートのC列で判定）。
   PROFiNDERページの「使い方ガイド」ボタンからも手動で開始できる（この場合はTOPの案内を飛ばして
   アクションボタンから始まる）。
   （A列で会員番号を検索し、その行のC列にチェックが付いているかどうかを見る）。
   表示が完了した時点で、GAS経由でC列にチェックを付けてもらう。
   ※ GAS側(Apps Script)に action:"checkTutorialSeen" / action:"markTutorialSeen" を
   　 受け取れるようにする実装が別途必要です（この2つのアクションはこのファイルから
   　 呼び出すだけで、Webアプリ側の処理は含まれていません）。
   ステップ自体はページ遷移・再読み込みをまたいでも再開できるよう localStorage にも保持する。
   1: TOPページでサイドバーのPROFiNDERへ誘導
   2: PROFiNDERページでASINリストのアクションボタンへ誘導
   3: アクションボタンのメニュー内「即補充が必要」へ誘導
   ========================================================================= */
const PF_TUTORIAL_STEP_KEY="shift_tutorial_profinder_step";
const PF_TUTORIAL_DONE_KEY="shift_tutorial_profinder_done";
function pfTutorialGetStep(){return parseInt(localStorage.getItem(PF_TUTORIAL_STEP_KEY)||"0",10)}
function pfTutorialSetStep(n){localStorage.setItem(PF_TUTORIAL_STEP_KEY,String(n))}
function pfTutorialIsDone(){return localStorage.getItem(PF_TUTORIAL_DONE_KEY)==="1"}
// 会員ステータス（チュートリアル既読・PROFiNDER契約）の静的JSON（GitHub側で「サイト公開」メニューから
// 手動公開される想定）をキャッシュ付きで取得する。お知らせ(fetchAnnouncements)と同じ考え方。
let MEMBER_STATUS_PROMISE=null;
const MEMBER_STATUS_JSON_PATH="member-status.json";
function fetchMemberStatus(){
  if(MEMBER_STATUS_PROMISE)return MEMBER_STATUS_PROMISE;
  MEMBER_STATUS_PROMISE=(async()=>{
    try{
      const res=await fetch(`${MEMBER_STATUS_JSON_PATH}?t=${Date.now()}`,{cache:"no-store"});
      if(res.ok){
        const data=await res.json();
        if(data&&data.members)return data.members;
      }
    }catch(e){/* 静的JSONが無い/失敗した場合は各呼び出し元でGASにフォールバック */}
    return null;
  })();
  return MEMBER_STATUS_PROMISE;
}
// 会員管理シートのC列（該当会員番号の行）にチェックが付いているか確認する
async function pfCheckTutorialSeen(memberNo){
  // 1) まず静的JSON（GitHub側で自動更新される想定）を試す。速い。
  const members=await fetchMemberStatus();
  if(members&&Object.prototype.hasOwnProperty.call(members,memberNo)){
    return !!members[memberNo].tutorialSeen;
  }
  // 2) フォールバック：GAS経由で取得（多少ラグがある）
  try{
    const controller=(typeof AbortController!=="undefined")?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),7000):null;
    const res=await fetch(GAS_WEB_APP_URL,{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"checkTutorialSeen",memberNo}),
      signal:controller?controller.signal:undefined
    });
    if(timer)clearTimeout(timer);
    const data=await res.json();
    if(!data||data.success===false){
      console.warn("[tutorial] checkTutorialSeenの応答が想定外でした（GAS側の再デプロイが必要かもしれません）:",data);
    }
    return !!(data&&data.seen);
  }catch(e){
    // シートを確認できない場合は、誤って毎回表示してしまわないよう「既読」扱いにする
    console.warn("[tutorial] checkTutorialSeenの呼び出しに失敗しました。GAS_WEB_APP_URLへの通信やデプロイ状況を確認してください:",e);
    return true;
  }
}
// 会員管理シートのC列（該当会員番号の行）にチェックを付ける
function pfMarkTutorialSeen(memberNo){
  if(!memberNo||!GAS_WEB_APP_URL)return;
  try{
    fetch(GAS_WEB_APP_URL,{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"markTutorialSeen",memberNo})
    }).catch(e=>console.warn("[tutorial] markTutorialSeenの呼び出しに失敗しました:",e));
  }catch(e){}
}
// 会員管理シートのD列（該当会員番号の行）のチェックボックスがONかどうかを確認する（PROFiNDERの契約有無）
async function pfCheckProfinderAccess(memberNo){
  // 1) まず静的JSON（GitHub側で自動更新される想定）を試す。速い。
  const members=await fetchMemberStatus();
  if(members&&Object.prototype.hasOwnProperty.call(members,memberNo)){
    return !!members[memberNo].profinderAccess;
  }
  // 2) フォールバック：GAS経由で取得（多少ラグがある）
  try{
    const controller=(typeof AbortController!=="undefined")?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),7000):null;
    const res=await fetch(GAS_WEB_APP_URL,{
      method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"checkProfinderAccess",memberNo}),
      signal:controller?controller.signal:undefined
    });
    if(timer)clearTimeout(timer);
    const data=await res.json();
    if(!data||data.success===false){
      console.warn("[profinder-access] checkProfinderAccessの応答が想定外でした（GAS側の再デプロイが必要かもしれません）:",data);
    }
    return !!(data&&data.hasAccess);
  }catch(e){
    console.warn("[profinder-access] checkProfinderAccessの呼び出しに失敗しました:",e);
    return false; // 確認できない場合は安全側に倒して申し込み画面を表示する
  }
}
function pfTutorialEnd(){
  localStorage.setItem(PF_TUTORIAL_DONE_KEY,"1");
  localStorage.removeItem(PF_TUTORIAL_STEP_KEY);
  const ov=document.getElementById("pfTutorialOverlay");
  if(ov)ov.remove();
  window.removeEventListener("resize",pfTutorialReposition);
  const session=getSession();
  if(session&&session.memberNo)pfMarkTutorialSeen(session.memberNo);
}
let PF_TUTORIAL_TARGET=null;
function pfTutorialReposition(){
  if(PF_TUTORIAL_TARGET)pfTutorialShow(PF_TUTORIAL_TARGET.el,PF_TUTORIAL_TARGET.text,PF_TUTORIAL_TARGET.placement);
}
function pfTutorialShow(targetEl,text,placement){
  if(!targetEl)return;
  PF_TUTORIAL_TARGET={el:targetEl,text,placement};
  let ov=document.getElementById("pfTutorialOverlay");
  if(!ov){
    ov=document.createElement("div");
    ov.id="pfTutorialOverlay";
    ov.className="pf-tutorial-overlay";
    ov.innerHTML=`
      <div class="pf-tutorial-spotlight" id="pfTutorialSpotlight"></div>
      <div class="pf-tutorial-bubble" id="pfTutorialBubble">
        <div class="pf-tutorial-bubble-text" id="pfTutorialBubbleText"></div>
        <div class="pf-tutorial-bubble-arrow"></div>
      </div>
      <button type="button" class="pf-tutorial-skip" onclick="pfTutorialEnd()">✕ チュートリアルを終了</button>
    `;
    document.body.appendChild(ov);
    window.addEventListener("resize",pfTutorialReposition);
  }
  document.getElementById("pfTutorialBubbleText").textContent=text;
  const zoom=parseFloat(getComputedStyle(document.body).zoom)||1;
  const rect=targetEl.getBoundingClientRect();
  const pad=8;
  const spot=document.getElementById("pfTutorialSpotlight");
  spot.style.left=((rect.left-pad)/zoom)+"px";
  spot.style.top=((rect.top-pad)/zoom)+"px";
  spot.style.width=((rect.width+pad*2)/zoom)+"px";
  spot.style.height=((rect.height+pad*2)/zoom)+"px";
  const bubble=document.getElementById("pfTutorialBubble");
  const bubbleWidth=240;
  const below=(rect.bottom+120)<window.innerHeight;
  let bx=Math.min(Math.max(12,rect.left),window.innerWidth-bubbleWidth-12)/zoom;
  let by=below?(rect.bottom+18)/zoom:(rect.top-18)/zoom;
  bubble.classList.toggle("pf-tutorial-bubble-above",!below);
  bubble.style.left=bx+"px";
  bubble.style.top=below?by+"px":"auto";
  bubble.style.bottom=below?"auto":(window.innerHeight/zoom-by)+"px";
  // 吹き出しの矢印をターゲットの中心に近い位置へ寄せる
  const arrow=bubble.querySelector(".pf-tutorial-bubble-arrow");
  const arrowX=Math.min(Math.max(20,(rect.left+rect.width/2)/zoom-bx),bubbleWidth-20);
  arrow.style.left=arrowX+"px";
}
/* TOPページ：ステップ1（サイドバーのPROFiNDERへ誘導） */
function pfTutorialShowStepTop(){
  const link=document.querySelector('a.sidebar-link[href="profinder.html"]');
  if(!link)return;
  pfTutorialSetStep(1);
  pfTutorialShow(link,"まずはリサーチをしてみましょう。サイドバーの「PROFiNDER」を押してください。");
  link.addEventListener("click",()=>pfTutorialSetStep(2),{once:true});
}
/* PROFiNDERページ：ステップ2（アクションボタン）→ステップ3（即補充が必要） */
function pfTutorialShowStepRestock(){
  pfTutorialSetStep(3);
  const restockBtn=Array.from(document.querySelectorAll("#pfActionMenu button")).find(b=>(b.getAttribute("onclick")||"").indexOf("'restock'")!==-1);
  if(restockBtn){
    pfTutorialShow(restockBtn,"続いて「即補充が必要」を押して、在庫補充が必要なASINを絞り込んでみましょう。");
    restockBtn.addEventListener("click",()=>pfTutorialEnd(),{once:true});
  }
}
function pfTutorialShowStepAction(){
  const actionBtn=document.querySelector('.pf-icon-btn[onclick^="pfShowActionMenu"]');
  if(!actionBtn)return;
  pfTutorialSetStep(2);
  pfTutorialShow(actionBtn,"アクションボタンを押して、リサーチするASINを選択します。");
  actionBtn.addEventListener("click",pfTutorialShowStepRestock,{once:true});
}
/* TOPページ読み込み時：ステップ1を再開、または未進行なら会員管理シートを確認して初回なら自動開始 */
async function pfTutorialInitTop(){
  const session=getSession();
  if(!session||!session.memberNo)return;
  // PROFiNDERの契約（会員管理シートD列）が無い会員には、そもそもチュートリアルを出さない
  const hasAccess=await pfCheckProfinderAccess(session.memberNo);
  if(!hasAccess)return;
  const step=pfTutorialGetStep();
  if(step===1){
    pfTutorialShowStepTop();
    return;
  }
  if(step>=2)return; // 既にPROFiNDER側のステップまで進んでいれば、TOP側では何もしない
  const seen=await pfCheckTutorialSeen(session.memberNo);
  if(!seen)pfTutorialShowStepTop();
}
/* PROFiNDERページ読み込み時：進行中のステップを再開する。
   TOPを経由せず直接このページに来た場合のフォールバックとして、未進行なら会員管理シートも確認する。 */
async function pfTutorialInitProfinder(){
  const step=pfTutorialGetStep();
  if(step===1||step===2){
    pfTutorialShowStepAction();
    return;
  }
  if(step===3){
    const actionBtn=document.querySelector('.pf-icon-btn[onclick^="pfShowActionMenu"]');
    if(!actionBtn)return;
    // ステップ3から再開する場合は、メニューを開き直してから案内する
    actionBtn.click();
    setTimeout(pfTutorialShowStepRestock,50);
    return;
  }
  const session=getSession();
  if(!session||!session.memberNo)return;
  const seen=await pfCheckTutorialSeen(session.memberNo);
  if(!seen)pfTutorialShowStepAction();
}
/* PROFiNDERページの「使い方ガイド」ボタン：使い方ガイド／チュートリアルの選択メニューを出す */
function pfShowHelpChoiceMenu(evt){
  evt.stopPropagation();
  let menu=document.getElementById("pfHelpChoiceMenu");
  if(!menu){
    menu=document.createElement("div");
    menu.id="pfHelpChoiceMenu";
    menu.className="pf-action-menu hidden";
    menu.onclick=e=>e.stopPropagation();
    menu.innerHTML=`
      <button type="button" onclick="pfHideHelpChoiceMenu();openHelpModal()"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M9.2 9a2.8 2.8 0 015.4 1c0 1.8-2.6 2.2-2.6 4"></path><circle cx="12" cy="16.6" r="0.1" fill="currentColor" stroke-width="1.6"></circle></svg><span>使い方ガイド</span></button>
      <button type="button" onclick="pfHideHelpChoiceMenu();pfTutorialStartNow()"><svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z"></path></svg><span>PROFiNDERのチュートリアルを見る</span></button>
    `;
    document.body.appendChild(menu);
  }
  menu.classList.remove("hidden");
  pfPositionMenuNearButton(menu,evt.currentTarget);
  document.addEventListener("click",pfHideHelpChoiceMenu,{once:true});
}
function pfHideHelpChoiceMenu(){
  const menu=document.getElementById("pfHelpChoiceMenu");
  if(menu)menu.classList.add("hidden");
}
function pfTutorialStartNow(){
  localStorage.removeItem(PF_TUTORIAL_DONE_KEY);
  pfTutorialShowStepAction();
}
