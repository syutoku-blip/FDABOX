/* =========================================================================
   profinder.js
   ProFinderページ (profinder.html) 専用スクリプト
   ※ 現時点ではセラーID/ASINの実データ取得API、外部アプリ連携は未接続のため、
      入力内容から一貫性のある「疑似データ」を生成して動作を再現しています。
      実際のAPI/アプリ連携が決まり次第、生成部分を実データ取得に差し替える想定です。
   ========================================================================= */

/* ---------- 疑似乱数（同じ入力なら毎回同じ結果になるようにする） ---------- */
function pfHashString(str){let h=0;for(let i=0;i<str.length;i++){h=(h*31+str.charCodeAt(i))>>>0}return h}
function pfSeededRandom(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return function(){s=s*16807%2147483647;return (s-1)/2147483646}}

/* ---------- モック用の候補データ ---------- */
const PF_CATEGORIES=["キッチン用品","おもちゃ・ホビー","美容・健康","ペット用品","スポーツ・アウトドア","家電","文房具・オフィス","ベビー・マタニティ","食品・飲料","car用品"];
const PF_PRODUCT_POOL=["ワイヤレスイヤホン","折りたたみ傘","ステンレスボトル","LEDデスクライト","ヨガマット","電動歯ブラシ","猫用自動給餌器","ポータブル加湿器","折りたたみチェア","モバイルバッテリー","収納ボックス","調理用はかり","抱っこ紐アクセサリー","ドッグハーネス","メイクブラシセット","スマホスタンド","ワイヤレス充電器","キャンプ用ランタン","ノートPCスタンド","ネックピロー"];
const PF_SELLER_PREFIX=["Tokyo","Global","Prime","Nippon","Sun","Star","Ocean","Sky","Green","Metro","Kanto","Fuji"];
const PF_SELLER_SUFFIX=["Trading","Store","Mart","Supply","Goods","Direct","Japan","Corp","Depot","Shop","Works"];

function pfGenerateSellerId(rand){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out="A";
  for(let i=0;i<13;i++)out+=chars[Math.floor(rand()*chars.length)];
  return out;
}
function pfGenerateSellerName(rand){
  return PF_SELLER_PREFIX[Math.floor(rand()*PF_SELLER_PREFIX.length)]+" "+PF_SELLER_SUFFIX[Math.floor(rand()*PF_SELLER_SUFFIX.length)];
}

/* ---------- ① セラーIDリサーチ：類似セラーを疑似生成 ---------- */
function pfGenerateSimilarSellers(seedId,count){
  count=count||15;
  const baseSeed=pfHashString(String(seedId||"").toUpperCase()||"DEFAULT");
  const list=[];
  for(let i=0;i<count;i++){
    const rand=pfSeededRandom(baseSeed+i*97);
    const similarity=Math.max(42,Math.round(97-i*3.1-rand()*4));
    const isFba=rand()<0.75;
    const isFbm=!isFba||rand()<0.3;
    const totalAsinCount=20+Math.floor(rand()*3200);
    const catCount=1+Math.floor(rand()*3);
    const categoryTags=[];
    while(categoryTags.length<catCount){
      const c=PF_CATEGORIES[Math.floor(rand()*PF_CATEGORIES.length)];
      if(!categoryTags.includes(c))categoryTags.push(c);
    }
    list.push({
      sellerId:pfGenerateSellerId(rand),
      name:pfGenerateSellerName(rand),
      category:categoryTags[0],
      categoryTags,
      productCount:20+Math.floor(rand()*480),
      rating:(3.5+rand()*1.5).toFixed(1),
      similarity,
      fulfillmentFba:isFba,
      fulfillmentFbm:isFbm,
      monthlyProfitJpy:Math.round(5000+rand()*95000),
      requiredApprovalProfitJpy:Math.round(3000+rand()*60000),
      unregisteredCount:Math.round(rand()*3200),
      categoryMatchRate:Math.round(30+rand()*68),
      unitPriceUsd:+(8+rand()*90).toFixed(0),
      totalAsinCount
    });
  }
  return list.sort((a,b)=>b.similarity-a.similarity);
}

/* ---------- ② ASINリサーチ：ASIN詳細を疑似生成 ---------- */
const PF_BRAND_POOL=["Anker","Hikari","Kuraki","Sora","Tsuki","Nami","Yama","Umi","Hoshi","Kaze"];
const PF_CAUTION_POOL=["知財","大型","FBA納品制限"];
function pfGenerateAsinDetail(asinRaw){
  const asin=String(asinRaw||"").trim().toUpperCase();
  const seed=pfHashString(asin||"DEFAULT");
  const rand=pfSeededRandom(seed);
  const category=PF_CATEGORIES[Math.floor(rand()*PF_CATEGORIES.length)];
  const product=PF_PRODUCT_POOL[Math.floor(rand()*PF_PRODUCT_POOL.length)];
  const brand=PF_BRAND_POOL[Math.floor(rand()*PF_BRAND_POOL.length)];
  const priceUsd=+(9+rand()*90).toFixed(2);
  const priceJpy=Math.round(priceUsd*150);
  const costJpy=Math.round(priceJpy*(0.22+rand()*0.28));
  const shippingJpy=Math.round(180+rand()*420);
  const dutyJpy=Math.round(costJpy*0.1);
  const amzFeeJpy=Math.round(priceJpy*0.15);
  const depositJpy=Math.round(priceJpy-amzFeeJpy);
  const profitJpy=Math.round(depositJpy-costJpy-shippingJpy-dutyJpy);
  const profitUpsideJpy=Math.round(Math.max(300,profitJpy*(0.08+rand()*0.35)));
  const sellerCount=1+Math.floor(rand()*14);
  const salesRank=400+Math.floor(rand()*60000);
  const sales30=Math.floor(rand()*45);

  // 商品情報まわり
  const rating=rand()<0.15?null:+(3+rand()*2).toFixed(1);
  const cautions=PF_CAUTION_POOL.filter(()=>rand()<0.28);
  const jpAsin=rand()<0.4?("A"+asin.slice(1)):null;
  const jan=rand()<0.5?String(4900000000000+Math.floor(rand()*99999999)):null;

  // セラー数・サイズ・在庫・返品率
  const sizeCm=+(8+rand()*55).toFixed(1);
  const stock=Math.floor(rand()*400);
  const returnRate=+(rand()*8).toFixed(1);

  // 販売数（実績/予測） 180/90/30日
  const salesActual={d180:Math.floor(sales30*5.8*(0.8+rand()*0.4)),d90:Math.floor(sales30*2.9*(0.8+rand()*0.4)),d30:sales30};
  const salesForecast={d180:Math.floor(salesActual.d180*(0.9+rand()*0.3)),d90:Math.floor(salesActual.d90*(0.9+rand()*0.3)),d30:Math.floor(salesActual.d30*(0.9+rand()*0.3))};

  // FBA最安値
  const fbaLowest=Math.round(priceJpy*(0.92+rand()*0.12));
  const fbaLowest3mo=Math.round(fbaLowest*(0.9+rand()*0.2));

  // 推奨仕入数：レベル(ミニマム/バランス/ステップアップ) × 期間(180/120/90/60/30/15日間)
  const levels=["minimum","balance","stepup"];
  const periods=[180,120,90,60,30,15];
  const recommendedQty={};
  levels.forEach((lv,li)=>{
    recommendedQty[lv]={};
    periods.forEach(p=>{
      const base=(salesForecast.d30/30)*p;
      const levelFactor=lv==="minimum"?0.5:lv==="balance"?0.8:1.15;
      recommendedQty[lv][p]=Math.max(0,Math.round(base*levelFactor*(0.85+rand()*0.3)));
    });
  });

  // Keepa風の価格推移（60日分）
  const priceHistory=[];
  let cur=priceJpy*(0.85+rand()*0.3);
  for(let i=59;i>=0;i--){
    cur=Math.max(500,cur+(rand()-0.5)*priceJpy*0.06);
    priceHistory.push(Math.round(cur));
  }
  priceHistory[priceHistory.length-1]=priceJpy;

  // 需要供給スコア
  const asinScore=Math.round(35+rand()*60);

  // TVI(価格変動指数)・BPI(バンド指数)：Keepa風の価格推移から算出
  const mean=priceHistory.reduce((a,b)=>a+b,0)/priceHistory.length;
  const variance=priceHistory.reduce((a,b)=>a+(b-mean)**2,0)/priceHistory.length;
  const tvi=Math.round((Math.sqrt(variance)/mean)*100)+95;
  const min90=Math.min(...priceHistory);
  const max90=Math.max(...priceHistory);
  const bpi=max90>min90?Math.round(((priceJpy-min90)/(max90-min90))*100):100;
  const priceTrendUp=priceHistory[priceHistory.length-1]>=priceHistory[0];
  const tviNote=priceTrendUp?"割安・上昇余地":"割高・下落リスク";
  const sellerTrendUp=rand()<0.5;
  const sellerTrendNote=sellerTrendUp?`▲セラー増 ${Math.round(10+rand()*40)}%`:`▼セラー減 ${Math.round(5+rand()*25)}%`;
  const bpiNote=bpi>=100?"損益分岐を防衛":"損益分岐に接近中";
  const recommendedStock=recommendedQty.balance[30];
  const salesPerDay=salesForecast.d30/30;
  const stockoutDays=salesPerDay>0.1?Math.round(stock/salesPerDay):null;

  // TWAP(時間加重平均価格)・乖離率・バンド上下限（USD）：販売額$の詳細パネル用
  const twapJpy=Math.round(mean);
  const twapUsd=+(twapJpy/150).toFixed(2);
  const priceDeviationRate=+((priceUsd-twapUsd)/twapUsd*100).toFixed(1);
  const bandLowUsd=+(min90/150).toFixed(2);
  const bandHighUsd=+(max90/150).toFixed(2);

  // TWAP価格で仕入れていた場合の想定利益（想定利益額の詳細パネル用）
  const costRatio=priceJpy?costJpy/priceJpy:0;
  const twapCostJpy=Math.round(twapJpy*costRatio);
  const twapAmzFeeJpy=Math.round(twapJpy*0.15);
  const twapDepositJpy=Math.round(twapJpy-twapAmzFeeJpy);
  const twapDutyJpy=Math.round(twapCostJpy*0.1);
  const twapProfitJpy=Math.round(twapDepositJpy-twapCostJpy-shippingJpy-twapDutyJpy);
  const profitDeviationRate=twapProfitJpy?+((profitJpy-twapProfitJpy)/Math.abs(twapProfitJpy)*100).toFixed(1):0;
  const dutyRatePct=costJpy?+(dutyJpy/costJpy*100).toFixed(1):0;
  const twapRate=twapJpy?+(twapProfitJpy/twapJpy*100).toFixed(1):0;

  return {
    asin,title:product,brand,category,priceUsd,priceJpy,costJpy,shippingJpy,dutyJpy,amzFeeJpy,depositJpy,profitJpy,profitUpsideJpy,
    sellerCount,salesRank,sales30,rating,cautions,jpAsin,usAsin:asin,jan,
    sizeCm,stock,returnRate,salesActual,salesForecast,fbaLowest,fbaLowest3mo,
    recommendedQty,priceHistory,asinScore,
    tvi,tviNote,sellerTrendNote,bpi,bpiNote,recommendedStock,stockoutDays,
    twapUsd,priceDeviationRate,bandLowUsd,bandHighUsd,twapProfitJpy,profitDeviationRate,dutyRatePct,twapRate
  };
}
function pfCautionLabel(c){return c}
const PF_CATEGORY_EMOJI={
  "キッチン用品":"🍳","おもちゃ・ホビー":"🧸","美容・健康":"💄","ペット用品":"🐾",
  "スポーツ・アウトドア":"🏕️","家電":"🔌","文房具・オフィス":"✏️","ベビー・マタニティ":"🍼",
  "食品・飲料":"🥤","car用品":"🚗"
};
const PF_THUMB_COLORS=["#3d7dff","#0f9d8f","#c0399b","#f6a821","#2554d1","#e0645f","#5b8def","#38b28f","#a86bd6","#d98a2b"];
function pfProductThumbSrc(a){
  const color=PF_THUMB_COLORS[pfHashString(a.asin)%PF_THUMB_COLORS.length];
  const emoji=PF_CATEGORY_EMOJI[a.category]||"📦";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="16" fill="${color}"/><text x="40" y="47" font-size="36" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
  return "data:image/svg+xml,"+encodeURIComponent(svg);
}

/* ---------- 状態管理 (sessionStorage) ---------- */
const PF_CART_KEY="profinder_cart";
const PF_FAVORITES_KEY="profinder_favorites";
const PF_APPASIN_KEY="profinder_app_asins";
const PF_PURCHASED_KEY="profinder_purchased";

const PF_CART_EXPIRY_MS=24*60*60*1000; // カート内の商品は追加から24時間で自動削除
function pfGetCart(){
  let list;
  try{list=JSON.parse(sessionStorage.getItem(PF_CART_KEY)||"[]")}catch(e){list=[]}
  const now=Date.now();
  const fresh=list.filter(item=>!item.addedAtTs||(now-item.addedAtTs)<PF_CART_EXPIRY_MS);
  if(fresh.length!==list.length)pfSaveCart(fresh);
  return fresh;
}
function pfSaveCart(list){sessionStorage.setItem(PF_CART_KEY,JSON.stringify(list))}
function pfGetFavorites(){try{return JSON.parse(sessionStorage.getItem(PF_FAVORITES_KEY)||"[]")}catch(e){return []}}
function pfSaveFavorites(list){sessionStorage.setItem(PF_FAVORITES_KEY,JSON.stringify(list))}
function pfGetPurchased(){try{return JSON.parse(sessionStorage.getItem(PF_PURCHASED_KEY)||"[]")}catch(e){return []}}

/* ---------- お気に入り（ASIN・セラー共通） ---------- */
function pfIsFavorite(type,id){return pfGetFavorites().some(f=>f.type===type&&f.id===id)}
function pfToggleFavoriteAsin(asin,btn){
  const detail=pfGenerateAsinDetail(asin);
  let favorites=pfGetFavorites();
  if(pfIsFavorite("asin",asin)){
    favorites=favorites.filter(f=>!(f.type==="asin"&&f.id===asin));
    showCopyToast(`${asin} をお気に入りから外しました`);
  }else{
    favorites.push({type:"asin",id:asin,data:detail,addedAt:pfToday()});
    showCopyToast(`${asin} をお気に入りに追加しました`);
  }
  pfSaveFavorites(favorites);
  if(btn)btn.classList.toggle("active");
}
function pfToggleFavoriteSeller(sellerId,sellerData,btn){
  let favorites=pfGetFavorites();
  if(pfIsFavorite("seller",sellerId)){
    favorites=favorites.filter(f=>!(f.type==="seller"&&f.id===sellerId));
    showCopyToast(`${sellerId} をお気に入りから外しました`);
  }else{
    favorites.push({type:"seller",id:sellerId,data:sellerData,addedAt:pfToday()});
    showCopyToast(`${sellerId} をお気に入りに追加しました`);
  }
  pfSaveFavorites(favorites);
  if(btn)btn.classList.toggle("active");
}
function pfSavePurchased(list){sessionStorage.setItem(PF_PURCHASED_KEY,JSON.stringify(list))}
function pfGetAppAsins(){
  try{
    const raw=sessionStorage.getItem(PF_APPASIN_KEY);
    if(raw)return JSON.parse(raw);
  }catch(e){/* fallthrough */}
  // 初回はサンプルとして「アプリから送信された想定」のASINをいくつか用意しておく
  const seedAsins=["B0EXAMPLE1","B0EXAMPLE2","B0EXAMPLE3","B0EXAMPLE4","B0EXAMPLE5"];
  const initial=seedAsins.map(a=>({asin:a,receivedAt:new Date().toISOString().slice(0,10)}));
  sessionStorage.setItem(PF_APPASIN_KEY,JSON.stringify(initial));
  return initial;
}
function pfSaveAppAsins(list){sessionStorage.setItem(PF_APPASIN_KEY,JSON.stringify(list))}

function pfFormatYen(n){return Number.isFinite(n)?`¥${Math.round(n).toLocaleString("ja-JP")}`:"-"}
function pfFormatUsd(n){return Number.isFinite(n)?`$${Number(n).toFixed(2)}`:"-"}
function pfToday(){return new Date().toISOString().slice(0,10)}

/* ---------- タブ切り替え ---------- */
function switchProfinderTab(type){
  const panelIds={newresearch:"pfNewresearchPanel",cart:"pfCartPanel",purchased:"pfPurchasedPanel",appasin:"pfAppAsinPanel",favorites:"pfFavoritesPanel"};
  Object.keys(panelIds).forEach(key=>{
    const panel=document.getElementById(panelIds[key]);
    if(panel)panel.classList.toggle("hidden",key!==type);
    const tab=document.getElementById("pf"+key.charAt(0).toUpperCase()+key.slice(1)+"Tab");
    if(tab){tab.classList.toggle("active",key===type);tab.setAttribute("aria-selected",String(key===type))}
  });
  if(type==="cart")pfRenderCartList();
  if(type==="purchased")pfRenderPurchased();
  if(type==="appasin")pfRenderAppAsins();
  if(type==="favorites")pfRenderFavorites();
}

/* リサーチ内のサブタブ(ASINリスト/新規ASINリスト/セラーリスト/検索) */
function switchNewResearchSubTab(type){
  const panelIds={asinlist:"pfAsinListPanel",sellerlist:"pfSellerListPanel",search:"pfSearchPanel"};
  const tabIds={asinlist:"pfNrAsinListTab",sellerlist:"pfNrSellerListTab",search:"pfNrSearchTab"};
  Object.keys(panelIds).forEach(key=>{
    const panel=document.getElementById(panelIds[key]);
    if(panel)panel.classList.toggle("hidden",key!==type);
    const tab=document.getElementById(tabIds[key]);
    if(tab){tab.classList.toggle("active",key===type);tab.setAttribute("aria-selected",String(key===type))}
  });
  if(typeof updateNavArrowPosition==="function")updateNavArrowPosition();
  if(typeof refreshScrollIndicators==="function")refreshScrollIndicators();
}



/* ---------- ① セラーIDリサーチ：ASINをもとにセラーIDを収集 ---------- */
let PF_SELLER_RESULTS=[];
function pfSearchSellers(){
  const input=document.getElementById("pfSellerInput");
  const asin=input?input.value.trim():"";
  if(!asin){showCopyToast("ASINを入力してください");return}
  PF_SELLER_RESULTS=pfGenerateSimilarSellers(asin,18);
  pfRenderSellerResults();
}
function pfSellerRowHtml(s){
  const catTags=s.categoryTags.map(c=>`<span class="pf-cat-tag">${escapeHtml(c)}</span>`).join("");
  const shipBadges=(s.fulfillmentFba?'<span class="pf-ship-badge pf-ship-fba">FBA</span>':"")+(s.fulfillmentFbm?'<span class="pf-ship-badge pf-ship-fbm">FBM</span>':"");
  const favActive=pfIsFavorite("seller",s.sellerId)?" active":"";
  return `<tr>
    <td>
      <div class="pf-seller-name-row">
        <div>
          <div class="pf-product-title">${escapeHtml(s.name)}</div>
          <div class="pf-product-sub"><span class="asin-chip">${escapeHtml(s.sellerId)}</span></div>
        </div>
        <button type="button" class="pf-research-btn" onclick="pfResearchSellerFromInventory('${escapeHtml(s.sellerId)}')"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><line x1="20" y1="20" x2="15.5" y2="15.5"></line></svg>このセラーでリサーチする</button>
      </div>
    </td>
    <td class="pf-star-cell"><button type="button" class="pf-star-btn${favActive}" onclick='pfToggleFavoriteSeller(${JSON.stringify(s.sellerId)},${JSON.stringify(s)},this)' aria-label="お気に入り">☆</button></td>
    <td><div class="pf-ship-badges">${shipBadges}</div></td>
    <td class="pf-cell-strong stats-positive">${pfFormatYen(s.monthlyProfitJpy)}</td>
    <td class="pf-cell-strong" style="color:#c4501a">${pfFormatYen(s.requiredApprovalProfitJpy)}</td>
    <td class="pf-cell-strong">${s.unregisteredCount.toLocaleString("ja-JP")}</td>
    <td class="pf-cell-strong" style="color:var(--accent-dark)">${s.similarity}%</td>
    <td class="pf-cell-strong">${s.categoryMatchRate}%</td>
    <td class="pf-cell-strong">$${s.unitPriceUsd}</td>
    <td class="pf-cell-strong">${s.totalAsinCount.toLocaleString("ja-JP")}</td>
    <td><div class="pf-cat-tags">${catTags}</div></td>
  </tr>`;
}
function pfRenderSellerResults(){
  const tbody=document.getElementById("pfSellerResults");
  const empty=document.getElementById("pfSellerResultsEmpty");
  if(!tbody)return;
  if(!PF_SELLER_RESULTS.length){
    tbody.innerHTML="";
    if(empty)empty.classList.remove("hidden");
    return;
  }
  if(empty)empty.classList.add("hidden");
  tbody.innerHTML=PF_SELLER_RESULTS.map(pfSellerRowHtml).join("");
}

/* ---------- セラーリスト(デモ用ダミー、あらかじめ表示) ---------- */
const PF_SELLERLIST_SEEDS=["SELLERLIST1","SELLERLIST2","SELLERLIST3","SELLERLIST4","SELLERLIST5","SELLERLIST6"];
let PF_SELLERLIST_SELLERS=[];
function pfRenderSellerList(){
  const tbody=document.getElementById("pfSellerListTable");
  if(!tbody)return;
  PF_SELLERLIST_SELLERS=PF_SELLERLIST_SEEDS.map(seed=>pfGenerateSimilarSellers(seed,1)[0]);
  tbody.innerHTML=PF_SELLERLIST_SELLERS.map(pfSellerRowHtml).join("");
}
function pfResearchAllSellers(sellers){
  if(!sellers||!sellers.length){showCopyToast("リサーチ対象のセラーがありません");return}
  if(!PF_ASINLIST_ITEMS.length)PF_ASINLIST_ITEMS=PF_ASINLIST_SEEDS.map(pfGenerateAsinDetail);
  let combined=[];
  sellers.forEach(s=>{combined=combined.concat(pfGenerateSellerAsins(s.sellerId,6))});
  const existing=new Set(PF_ASINLIST_ITEMS.map(a=>a.asin));
  const fresh=combined.filter(a=>!existing.has(a.asin));
  PF_ASINLIST_ITEMS=PF_ASINLIST_ITEMS.concat(fresh);
  switchProfinderTab("newresearch");
  switchNewResearchSubTab("asinlist");
  pfRenderAsinList();
  showCopyToast(`${sellers.length}セラー分のASINを取得しました（新規${fresh.length}件）`);
}
function pfResearchSellerFromInventory(sellerId){
  if(!PF_ASINLIST_ITEMS.length)PF_ASINLIST_ITEMS=PF_ASINLIST_SEEDS.map(pfGenerateAsinDetail);
  const fetched=pfGenerateSellerAsins(sellerId,6);
  const existing=new Set(PF_ASINLIST_ITEMS.map(a=>a.asin));
  const fresh=fetched.filter(a=>!existing.has(a.asin));
  PF_ASINLIST_ITEMS=PF_ASINLIST_ITEMS.concat(fresh);
  switchProfinderTab("newresearch");
  switchNewResearchSubTab("asinlist");
  pfRenderAsinList();
  showCopyToast(`セラーID「${sellerId}」のASINを取得しました（新規${fresh.length}件）`);
}

/* ---------- ② ASINリサーチ 1: セラーIDを指定して取得 ---------- */
function pfGenerateAsinCode(rand){
  const chars="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out="B0";
  for(let i=0;i<8;i++)out+=chars[Math.floor(rand()*chars.length)];
  return out;
}
function pfGenerateSellerAsins(sellerId,count){
  count=count||10;
  const baseSeed=pfHashString(String(sellerId||"").toUpperCase()||"DEFAULT");
  const seen=new Set();
  const asins=[];
  for(let i=0;i<count;i++){
    const rand=pfSeededRandom(baseSeed+i*131+17);
    let asin=pfGenerateAsinCode(rand);
    while(seen.has(asin))asin=pfGenerateAsinCode(rand);
    seen.add(asin);
    asins.push(asin);
  }
  return asins.map(pfGenerateAsinDetail);
}
function pfSwitchSearchMode(mode){
  const sellerSearchView=document.getElementById("pfSellerSearchView");
  const asinSearchView=document.getElementById("pfAsinSearchView");
  const sellerSearchBtn=document.getElementById("pfSearchModeSellerSearchBtn");
  const asinSearchBtn=document.getElementById("pfSearchModeAsinSearchBtn");
  if(sellerSearchView)sellerSearchView.classList.toggle("hidden",mode!=="sellersearch");
  if(asinSearchView)asinSearchView.classList.toggle("hidden",mode!=="asinsearch");
  if(sellerSearchBtn)sellerSearchBtn.classList.toggle("active",mode==="sellersearch");
  if(asinSearchBtn)asinSearchBtn.classList.toggle("active",mode==="asinsearch");
}
function pfUnifiedSearch(){
  const input=document.getElementById("pfUnifiedSearchInput");
  const val=(input?input.value:"").trim().toUpperCase();
  if(!val){showCopyToast("ASINまたはセラーIDを入力してください");return}
  if(val.startsWith("B0")){
    pfSwitchAsinSearchSubMode("byasin");
    const target=document.getElementById("pfAsinDetailInput");
    if(target)target.value=val;
    pfSearchSingleAsin();
  }else{
    pfSwitchAsinSearchSubMode("byseller");
    const target=document.getElementById("pfAsinBySellerInput");
    if(target)target.value=val;
    pfFetchAsinsBySeller();
  }
}
function pfSwitchAsinSearchSubMode(mode){
  const bySellerView=document.getElementById("pfAsinSearchBySellerView");
  const byAsinView=document.getElementById("pfAsinSearchByAsinView");
  const bySellerBtn=document.getElementById("pfAsinSearchBySellerBtn");
  const byAsinBtn=document.getElementById("pfAsinSearchByAsinBtn");
  if(bySellerView)bySellerView.classList.toggle("hidden",mode!=="byseller");
  if(byAsinView)byAsinView.classList.toggle("hidden",mode!=="byasin");
  if(bySellerBtn)bySellerBtn.classList.toggle("active",mode==="byseller");
  if(byAsinBtn)byAsinBtn.classList.toggle("active",mode==="byasin");
}
function pfSearchSingleAsin(){
  const input=document.getElementById("pfAsinDetailInput");
  const asin=input?input.value.trim():"";
  const empty=document.getElementById("pfAsinDetailResultsEmpty");
  const wrap=document.getElementById("pfAsinDetailResultsWrap");
  const tbody=document.getElementById("pfAsinDetailResults");
  if(!asin){showCopyToast("ASINを入力してください");return}
  const detail=pfGenerateAsinDetail(asin);
  const cart=pfGetCart();
  const inCart=cart.some(c=>c.asin===asin);
  if(tbody)tbody.innerHTML=pfAsinResearchRowHtml(detail,inCart);
  if(empty)empty.classList.add("hidden");
  if(wrap)wrap.classList.remove("hidden");
}
let PF_ASIN_BY_SELLER_RESULTS=[];
function pfFetchAsinsBySeller(){
  const input=document.getElementById("pfAsinBySellerInput");
  const sellerId=input?input.value.trim():"";
  if(!sellerId){showCopyToast("セラーIDを入力してください");return}
  PF_ASIN_BY_SELLER_RESULTS=pfGenerateSellerAsins(sellerId,10);
  pfRenderAsinBySellerResults();
}
function pfRenderAsinBySellerResults(){
  const tbody=document.getElementById("pfAsinBySellerResults");
  const empty=document.getElementById("pfAsinBySellerResultsEmpty");
  if(!tbody)return;
  if(!PF_ASIN_BY_SELLER_RESULTS.length){
    tbody.innerHTML="";
    if(empty)empty.classList.remove("hidden");
    return;
  }
  if(empty)empty.classList.add("hidden");
  const cart=pfGetCart();
  const cartAsins=new Set(cart.map(c=>c.asin));
  tbody.innerHTML=PF_ASIN_BY_SELLER_RESULTS.map(a=>{
    const inCart=cartAsins.has(a.asin);
    const profitCls=a.profitJpy>=0?"profit-positive":"profit-negative";
    const favActive=pfIsFavorite("asin",a.asin)?" active":"";
    return `<tr class="pf-clickable-row" onclick="pfOpenAsinDetailModal('${escapeHtml(a.asin)}')">
      <td class="pf-star-cell" onclick="event.stopPropagation()"><button type="button" class="pf-star-btn${favActive}" onclick="pfToggleFavoriteAsin('${escapeHtml(a.asin)}',this)" aria-label="お気に入り">☆</button></td>
      <td class="pf-cell-product">
        <div class="pf-product-cell">
          <div class="pf-product-thumb"></div>
          <div>
            <div class="pf-product-title">${escapeHtml(a.title)}</div>
            <div class="pf-product-sub"><span class="asin-chip">${escapeHtml(a.asin)}</span><span class="item-tag">${escapeHtml(a.category)}</span></div>
          </div>
        </div>
      </td>
      <td class="pf-cell-strong">${pfFormatYen(a.priceJpy)}<div class="pf-cell-sub">(${pfFormatUsd(a.priceUsd)})</div></td>
      <td class="pf-cell-strong ${profitCls}">${pfFormatYen(a.profitJpy)}</td>
      <td onclick="event.stopPropagation()">
        <button type="button" class="copy-btn ${inCart?"":"copy-btn-primary"}" onclick="pfToggleCart('${escapeHtml(a.asin)}')">${inCart?"カートから外す":"カートに入れる"}</button>
      </td>
    </tr>`;
  }).join("");
}

/* ---------- ASINリスト（あらかじめ表示） ---------- */
const PF_ASINLIST_SEEDS=["B0ASINLIST01","B0ASINLIST02","B0ASINLIST03","B0ASINLIST04","B0ASINLIST05","B0ASINLIST06","B0ASINLIST07","B0ASINLIST08","B0ASINLIST09","B0ASINLIST10","B0ASINLIST11","B0ASINLIST12"];
let PF_ASINLIST_ITEMS=[];
function pfRenderAsinList(){
  const tbody=document.getElementById("pfAsinListTable");
  if(!tbody)return;
  if(!PF_ASINLIST_ITEMS.length)PF_ASINLIST_ITEMS=PF_ASINLIST_SEEDS.map(pfGenerateAsinDetail);
  const cart=pfGetCart();
  const cartAsins=new Set(cart.map(c=>c.asin));
  const items=PF_ASINLIST_ACTIVE_FILTERS.length?PF_ASINLIST_ITEMS.filter(pfAsinPassesActiveFilters):PF_ASINLIST_ITEMS;
  tbody.innerHTML=items.map(a=>pfAsinResearchRowHtml(a,cartAsins.has(a.asin))).join("");
}

/* ---------- 個別フィルター定義（チェック式・複数同時適用） ---------- */
const PF_ASINLIST_FILTER_DEFS={
  handled:{label:"取り扱い済み",test:a=>pfGetCart().some(c=>c.asin===a.asin)||pfGetPurchased().some(p=>p.asin===a.asin)},
  newitem:{label:"NEW",test:a=>a.sales30<5},
  lowstock:{label:"在庫不足",test:a=>a.stockoutDays!=null&&a.stockoutDays<=10},
  stagnant:{label:"滞留在庫",test:a=>a.stock>200&&a.sales30<5},
  hightvi:{label:"高TVI",test:a=>a.tvi>=100},
  highbpi:{label:"高BPI",test:a=>a.bpi>=100},
  outofstock:{label:"在庫切れ",test:a=>a.stock===0},
  ip:{label:"知財",test:a=>a.cautions.includes("知財")},
  variation:{label:"バリエーションあり",test:a=>a.recommendedStock>=15}
};
/* アクションボタンは、上のフィルターを自動でセットするだけのショートカット */
const PF_ASINLIST_ACTIONS={
  newasins:{label:"新規ASINを取得"},
  restock:{label:"即補充が必要",filterKey:"lowstock"},
  opportunity:{label:"仕入好機（高TVI・BPI）",filterKeys:["hightvi","highbpi"]},
  variation:{label:"バリエーション開拓",filterKey:"variation"},
  stockoutsellable:{label:"完全在庫切れ×売れそう",filterKey:"outofstock"},
  stagnant:{label:"滞留在庫を処分検討",filterKey:"stagnant"},
  ip:{label:"知財入り商品",filterKey:"ip"}
};
let PF_ASINLIST_ACTIVE_ACTION=null; // {key,label}
let PF_ASINLIST_ACTIVE_FILTERS=[]; // [{key,label,test,group}]
function pfAsinPassesActiveFilters(a){
  const groups={};
  PF_ASINLIST_ACTIVE_FILTERS.forEach(f=>{
    const g=f.group||f.key;
    (groups[g]=groups[g]||[]).push(f);
  });
  return Object.values(groups).every(fs=>fs.some(f=>f.test(a)));
}
function pfFilterAlreadyActive(key){return PF_ASINLIST_ACTIVE_FILTERS.some(f=>f.key===key)}
function pfAddAsinListFilter(key,label,test,group,actionKey){
  if(pfFilterAlreadyActive(key))return;
  PF_ASINLIST_ACTIVE_FILTERS.push({key,label,test,group,actionKey});
  pfRenderAsinList();
  pfRenderAsinListFilterChips();
}
function pfRemoveAsinListFilter(key){
  PF_ASINLIST_ACTIVE_FILTERS=PF_ASINLIST_ACTIVE_FILTERS.filter(f=>f.key!==key);
  if(PF_ASINLIST_ACTIVE_ACTION&&!PF_ASINLIST_ACTIVE_FILTERS.some(f=>f.actionKey===PF_ASINLIST_ACTIVE_ACTION.key)){
    PF_ASINLIST_ACTIVE_ACTION=null;
  }
  pfRenderAsinList();
  pfRenderAsinListFilterChips();
}
function pfRemoveAsinListAction(actionKey){
  PF_ASINLIST_ACTIVE_FILTERS=PF_ASINLIST_ACTIVE_FILTERS.filter(f=>f.actionKey!==actionKey);
  if(PF_ASINLIST_ACTIVE_ACTION&&PF_ASINLIST_ACTIVE_ACTION.key===actionKey)PF_ASINLIST_ACTIVE_ACTION=null;
  pfRenderAsinList();
  pfRenderAsinListFilterChips();
}
function pfClearAsinListFilter(){
  PF_ASINLIST_ACTIVE_FILTERS=[];
  PF_ASINLIST_ACTIVE_ACTION=null;
  pfRenderAsinList();
  pfRenderAsinListFilterChips();
}
function pfRenderAsinListFilterChips(){
  const wrap=document.getElementById("pfAsinListFilterChips");
  if(!wrap)return;
  const actionChip=PF_ASINLIST_ACTIVE_ACTION?`<button type="button" class="pf-action-chip" onclick="pfRemoveAsinListAction('${escapeHtml(PF_ASINLIST_ACTIVE_ACTION.key)}')">${escapeHtml(PF_ASINLIST_ACTIVE_ACTION.label)}<span class="pf-action-chip-x">✕</span></button>`:"";
  const filterChips=PF_ASINLIST_ACTIVE_FILTERS.map(f=>`<button type="button" class="pf-filter-chip" onclick="pfRemoveAsinListFilter('${escapeHtml(f.key)}')">${escapeHtml(f.label)}<span class="pf-filter-chip-x">✕</span></button>`).join("");
  wrap.innerHTML=actionChip+filterChips;
}
function pfToggleAsinListFilter(key){
  const def=PF_ASINLIST_FILTER_DEFS[key];
  if(!def)return;
  if(pfFilterAlreadyActive(key)){pfRemoveAsinListFilter(key)}
  else{pfAddAsinListFilter(key,def.label,def.test)}
  pfRenderFilterMenuRoot();
}
function pfPositionMenuNearButton(menu,btn){
  const rect=btn.getBoundingClientRect();
  const margin=12;
  const zoom=parseFloat(getComputedStyle(document.body).zoom)||1;
  let x=rect.left/zoom;
  let y=(rect.bottom+8)/zoom;
  const maxX=(window.innerWidth-menu.offsetWidth-margin)/zoom;
  if(x>maxX)x=Math.max(margin,maxX);
  const maxY=(window.innerHeight-menu.offsetHeight-margin)/zoom;
  if(y>maxY)y=Math.max(margin,maxY);
  menu.style.left=x+"px";
  menu.style.top=y+"px";
  // メニューの開始位置(y)から見て画面下端までの高さを超えないよう、開くたびに上限を再計算する
  // （固定のmax-heightだけだと、yが下の方になったときに画面外へはみ出してスクロールもできなくなるため）
  menu.style.maxHeight=Math.max(120,window.innerHeight/zoom-y-margin)+"px";
}
function pfShowActionMenu(evt){
  evt.stopPropagation();
  pfHideFilterMenu();
  const menu=document.getElementById("pfActionMenu");
  if(!menu)return;
  menu.classList.remove("hidden");
  pfPositionMenuNearButton(menu,evt.currentTarget);
}
function pfHideActionMenu(){
  const menu=document.getElementById("pfActionMenu");
  if(menu)menu.classList.add("hidden");
}
function pfShowFilterMenu(evt){
  evt.stopPropagation();
  pfHideActionMenu();
  const menu=document.getElementById("pfFilterMenu");
  if(!menu)return;
  pfRenderFilterMenuRoot();
  menu.classList.remove("hidden");
  pfPositionMenuNearButton(menu,evt.currentTarget);
}
function pfHideFilterMenu(){
  const menu=document.getElementById("pfFilterMenu");
  if(menu)menu.classList.add("hidden");
}
document.addEventListener("click",()=>{pfHideActionMenu();pfHideFilterMenu()});

function pfRenderFilterMenuRoot(){
  const menu=document.getElementById("pfFilterMenu");
  if(!menu)return;
  const toggles=Object.keys(PF_ASINLIST_FILTER_DEFS).map(key=>{
    const def=PF_ASINLIST_FILTER_DEFS[key];
    const active=pfFilterAlreadyActive(key);
    return `<button type="button" class="pf-action-menu-item${active?" pf-action-menu-item-active":""}" onclick="event.stopPropagation();pfToggleAsinListFilter('${key}')"><svg viewBox="0 0 24 24">${active?'<path d="M20 6L9 17l-5-5"></path>':'<circle cx="12" cy="12" r="9"></circle>'}</svg><span>${escapeHtml(def.label)}</span></button>`;
  }).join("");
  menu.innerHTML=toggles+
    `<div class="pf-action-menu-divider-line"></div>
    <button type="button" class="pf-action-menu-item" onclick="event.stopPropagation();pfRenderFilterMenuProfitRate()"><svg viewBox="0 0 24 24"><path d="M12 1v22"></path><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7"></path></svg><span>利益率</span></button>
    <button type="button" class="pf-action-menu-item" onclick="event.stopPropagation();pfRenderFilterMenuCategory()"><svg viewBox="0 0 24 24"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3a1 1 0 00-1 1l.24 5.59a2 2 0 00.58 1.41l9.59 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z"></path><circle cx="7.5" cy="7.5" r="1"></circle></svg><span>カテゴリ</span></button>`;
}
const PF_AMAZON_CATEGORIES=["おもちゃ","キッチン","ベビー用品","車用品","ホーム＆キッチン","家電","スポーツ・アウトドア","美容・健康","文房具・オフィス","ペット用品","食品・飲料"];
function pfRenderFilterMenuCategory(){
  const menu=document.getElementById("pfFilterMenu");
  if(!menu)return;
  menu.innerHTML=`<button type="button" class="pf-action-menu-back" onclick="event.stopPropagation();pfRenderFilterMenuRoot()">‹ 戻る</button>`+
    PF_AMAZON_CATEGORIES.map(c=>`<button type="button" class="pf-action-menu-item" onclick="pfApplyCategoryFilter('${escapeHtml(c)}')"><svg viewBox="0 0 24 24"><path d="M20.59 13.41L11 3.83A2 2 0 009.59 3.24L4 3a1 1 0 00-1 1l.24 5.59a2 2 0 00.58 1.41l9.59 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z"></path><circle cx="7.5" cy="7.5" r="1"></circle></svg><span>${escapeHtml(c)}</span></button>`).join("");
}
function pfRenderFilterMenuProfitRate(){
  const menu=document.getElementById("pfFilterMenu");
  if(!menu)return;
  menu.innerHTML=`
    <button type="button" class="pf-action-menu-back" onclick="event.stopPropagation();pfRenderFilterMenuRoot()">‹ 戻る</button>
    <div class="pf-filter-form" onclick="event.stopPropagation()">
      <div class="input-group" style="margin-bottom:10px">
        <label class="input-label">利益率</label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" id="pfProfitRateValue" placeholder="例）20" style="width:80px;font-family:var(--font-mono)">
          <span style="font-size:13px">%</span>
          <select id="pfProfitRateDirection" style="flex:1">
            <option value="gte">以上</option>
            <option value="lte">以下</option>
          </select>
        </div>
      </div>
      <button type="button" class="copy-btn copy-btn-primary" style="width:100%" onclick="pfApplyProfitRateFilter()">適用する</button>
    </div>
  `;
}
function pfApplyProfitRateFilter(){
  const val=Number(document.getElementById("pfProfitRateValue")?.value);
  const dir=document.getElementById("pfProfitRateDirection")?.value;
  if(!val&&val!==0){showCopyToast("利益率を入力してください");return}
  pfHideFilterMenu();
  const label=`利益率${val}%${dir==="gte"?"以上":"以下"}`;
  const key="profitrate_"+val+"_"+dir;
  pfAddAsinListFilter(key,label,a=>{const rate=a.priceJpy?(a.profitJpy/a.priceJpy*100):0;return dir==="gte"?rate>=val:rate<=val});
}
function pfApplyCategoryFilter(category){
  pfHideFilterMenu();
  pfAddAsinListFilter("category_"+category,category,a=>a.category===category);
}
function pfFetchNewAsinsFromActionMenu(){
  pfHideActionMenu();
  pfClearAsinListFilter();
  pfResearchAllSellers(PF_SELLERLIST_SELLERS);
  PF_ASINLIST_ACTIVE_ACTION={key:"newasins",label:PF_ASINLIST_ACTIONS.newasins.label};
  const highPotentialTest=a=>a.tvi>=100&&a.bpi>=100;
  pfAddAsinListFilter("newitem","NEW",a=>a.sales30<5,"newhighpotential","newasins");
  pfAddAsinListFilter("hp_hightvi","高TVI",highPotentialTest,"newhighpotential","newasins");
  pfAddAsinListFilter("hp_highbpi","高BPI",highPotentialTest,"newhighpotential","newasins");
}
function pfApplyProfinderEye(){
  pfClearAsinListFilter();
  PF_ASINLIST_ACTIVE_ACTION={key:"profindereye",label:"PROFiNDER eye"};
  const newDef=PF_ASINLIST_FILTER_DEFS.newitem;
  const handledDef=PF_ASINLIST_FILTER_DEFS.handled;
  pfAddAsinListFilter("newitem",newDef.label,newDef.test,"profindereye","profindereye");
  pfAddAsinListFilter("handled",handledDef.label,handledDef.test,"profindereye","profindereye");
}
function pfApplyAsinListFilter(actionKey){
  const action=PF_ASINLIST_ACTIONS[actionKey];
  if(!action)return;
  pfHideActionMenu();
  pfClearAsinListFilter();
  PF_ASINLIST_ACTIVE_ACTION={key:actionKey,label:action.label};
  const keys=action.filterKeys||[action.filterKey];
  keys.forEach(key=>{
    const def=PF_ASINLIST_FILTER_DEFS[key];
    if(def)pfAddAsinListFilter(key,def.label,def.test,null,actionKey);
  });
}
function pfAsinResearchRowHtml(a,inCart){
  const profitCls=a.profitJpy>=0?"profit-positive":"profit-negative";
  const profitRate=a.priceJpy?Math.round(a.profitJpy/a.priceJpy*100):0;
  const tviTone=a.tviNote==="割安・上昇余地"?"tone-ok":"tone-warn";
  const bpiTone=a.bpi>=100?"tone-ok":"tone-warn";
  const jpBuyUrl=`https://www.amazon.co.jp/s?k=${encodeURIComponent(a.title)}`;
  const rakutenUrl=`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(a.title)}/`;
  const q=a.recommendedQty.balance;
  const priceDevCls=a.priceDeviationRate>0?"profit-positive":a.priceDeviationRate<0?"profit-negative":"";
  const profitDevCls=a.profitDeviationRate>0?"profit-positive":a.profitDeviationRate<0?"profit-negative":"";
  const purchased=pfGetPurchased().filter(p=>p.asin===a.asin);
  const pastProfitTotalJpy=purchased.reduce((sum,p)=>sum+(p.profitJpy||a.profitJpy)*(p.qty||1),0);
  const twapProfitTotalJpy=purchased.reduce((sum,p)=>sum+(a.twapProfitJpy)*(p.qty||1),0);
  const pastRate=purchased.length?Math.round(purchased.reduce((sum,p)=>sum+(p.priceJpy?((p.profitJpy||a.profitJpy)/p.priceJpy*100):profitRate),0)/purchased.length*10)/10:profitRate;
  return `<tr>
      <td class="pf-cell-product">
        <div class="pf-product-cell">
          <div class="pf-product-thumb"><img src="${pfProductThumbSrc(a)}" alt="" width="40" height="40" loading="lazy"></div>
          <div>
            <div class="pf-product-title" onclick="pfOpenAsinDetailModal('${escapeHtml(a.asin)}')">${escapeHtml(a.title)}</div>
            <div class="pf-product-sub"><span class="asin-chip">${escapeHtml(a.asin)}</span></div>
          </div>
        </div>
      </td>
      <td class="pf-star-cell" onclick="event.stopPropagation()"><button type="button" class="pf-star-btn${pfIsFavorite("asin",a.asin)?" active":""}" onclick="pfToggleFavoriteAsin('${escapeHtml(a.asin)}',this)" aria-label="お気に入り">☆</button></td>
      <td class="pf-cell-strong profit-positive">+${pfFormatYen(a.profitUpsideJpy)}</td>
      <td class="pf-cell-restock">
        <div class="pf-restock-tiers">
          <div class="pf-restock-tier"><span class="pf-restock-days">15日</span><span class="pf-restock-num">${q[15]}</span></div>
          <div class="pf-restock-tier pf-restock-tier-active"><span class="pf-restock-days">30日</span><span class="pf-restock-num">${q[30]}</span><span class="pf-restock-sub">推奨</span></div>
          <div class="pf-restock-tier pf-restock-tier-muted"><span class="pf-restock-days">60日</span><span class="pf-restock-num">${q[60]}</span></div>
        </div>
        <div class="pf-restock-stock">在庫${a.stock}</div>
      </td>
      <td>${a.stockoutDays!=null?a.stockoutDays+"日":"—"}</td>
      <td class="pf-cell-strong">${pfFormatUsd(a.priceUsd)}</td>
      <td class="pf-expand-col pf-expand-price">${pfFormatUsd(a.twapUsd)}</td>
      <td class="pf-expand-col pf-expand-price ${priceDevCls}">${a.priceDeviationRate>0?"+":""}${a.priceDeviationRate}%</td>
      <td class="pf-expand-col pf-expand-price">${pfFormatUsd(a.bandLowUsd)}</td>
      <td class="pf-expand-col pf-expand-price">${pfFormatUsd(a.bandHighUsd)}</td>
      <td class="pf-expand-col pf-expand-price">${a.bpi}</td>
      <td class="${profitCls} pf-cell-strong">${pfFormatYen(a.profitJpy)}</td>
      <td class="pf-expand-col pf-expand-profit profit-positive">${pfFormatYen(pastProfitTotalJpy)}</td>
      <td class="pf-expand-col pf-expand-profit profit-positive">${pfFormatYen(twapProfitTotalJpy)}</td>
      <td class="pf-expand-col pf-expand-profit ${profitDevCls}">${a.profitDeviationRate>0?"+":""}${a.profitDeviationRate}%</td>
      <td class="pf-expand-col pf-expand-profit">${pfFormatYen(a.profitJpy)}</td>
      <td class="pf-expand-col pf-expand-profit profit-negative">−${pfFormatYen(a.dutyJpy)}</td>
      <td class="pf-expand-col pf-expand-profit">${a.dutyRatePct}%</td>
      <td class="${profitCls} pf-cell-strong">${profitRate}%</td>
      <td class="pf-expand-col pf-expand-rate profit-positive">${pastRate}%</td>
      <td class="pf-expand-col pf-expand-rate profit-positive">${a.twapRate}%</td>
      <td class="pf-expand-col pf-expand-rate">${a.returnRate.toFixed(1)}%</td>
      <td>
        <span class="pf-index-badge ${tviTone}">${a.tvi}%</span>
        <div class="pf-index-note">${escapeHtml(a.tviNote)}<br>${escapeHtml(a.sellerTrendNote)}</div>
      </td>
      <td>
        <span class="pf-index-badge ${bpiTone}">${a.bpi}%</span>
        <div class="pf-index-note">${escapeHtml(a.bpiNote)}</div>
      </td>
      <td>
        <div class="pf-buy-btns">
          <a href="${jpBuyUrl}" target="_blank" rel="noopener" class="pf-buy-btn pf-buy-jp" onclick="event.stopPropagation()">日本で買う</a>
          <a href="${rakutenUrl}" target="_blank" rel="noopener" class="pf-buy-btn pf-buy-rakuten" onclick="event.stopPropagation()">楽天で買う</a>
          <button type="button" class="copy-btn ${inCart?"":"copy-btn-primary"}" style="width:100%" onclick="pfToggleCart('${escapeHtml(a.asin)}')">${inCart?"カートから外す":"カートに入れる"}</button>
        </div>
      </td>
    </tr>`;
}
function pfToggleAsinListExpand(kind,evt){
  const table=(evt&&evt.currentTarget&&evt.currentTarget.closest(".pf-asinlist-table"))||document.getElementById("pfAsinListTableEl");
  if(!table)return;
  table.classList.toggle("pf-expand-"+kind+"-open");
}

function pfToggleCart(asin){
  const detail=pfGenerateAsinDetail(asin);
  let cart=pfGetCart();
  if(cart.some(c=>c.asin===asin)){
    cart=cart.filter(c=>c.asin!==asin);
    showCopyToast(`${asin} をカートから外しました`);
  }else{
    cart.push({...detail,addedAt:pfToday(),addedAtTs:Date.now()});
    showCopyToast(`${asin} をカートに入れました（24時間後に自動削除されます）`);
  }
  pfSaveCart(cart);
  pfRenderAsinList();
  pfRenderAsinBySellerResults();
  pfUpdateCartSummary();
}

/* ---------- ASIN詳細モーダル ---------- */
const PF_ASIN_NOTES_KEY="profinder_asin_notes";
function pfGetAsinNotes(){try{return JSON.parse(sessionStorage.getItem(PF_ASIN_NOTES_KEY)||"{}")}catch(e){return {}}}
function pfSaveAsinNote(asin,text){const notes=pfGetAsinNotes();notes[asin]=text;sessionStorage.setItem(PF_ASIN_NOTES_KEY,JSON.stringify(notes))}

let PF_MODAL_DETAIL=null;
const PF_PERIOD_LABELS={180:"180日間",120:"120日間",90:"90日間",60:"60日間",30:"30日間"};
const PF_LEVEL_LABELS={minimum:"ミニマム",balance:"バランス",stepup:"ステップアップ"};

function pfBuildPriceChart(history){
  if(!history||history.length<2)return '<div class="twap-empty">価格推移データがありません</div>';
  const W=560,H=140,padL=8,padR=8,padT=12,padB=12;
  const min=Math.min(...history),max=Math.max(...history);
  const pad=(max-min)*0.15||Math.max(max*0.05,1);
  const lo=min-pad,hi=max+pad;
  const innerW=W-padL-padR,innerH=H-padT-padB;
  const x=i=>padL+i*innerW/(history.length-1);
  const y=v=>padT+(1-(v-lo)/(hi-lo||1))*innerH;
  const pts=history.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
  const area=`${padL},${padT+innerH} ${pts} ${x(history.length-1)},${padT+innerH}`;
  const lastX=x(history.length-1),lastY=y(history[history.length-1]);
  return `<svg class="twap-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="価格推移グラフ">
    <defs><linearGradient id="pfPriceGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2f5fe0" stop-opacity="0.28"></stop>
      <stop offset="100%" stop-color="#2f5fe0" stop-opacity="0"></stop>
    </linearGradient></defs>
    <polygon points="${area}" fill="url(#pfPriceGrad)"></polygon>
    <polyline points="${pts}" fill="none" stroke="#2f5fe0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
    <circle cx="${lastX}" cy="${lastY}" r="3.4" fill="#2f5fe0" stroke="#fff" stroke-width="1.6"></circle>
  </svg>`;
}
function pfBuildRecommendedQtyTable(recommendedQty){
  const periods=[180,120,90,60,30];
  const levels=["minimum","balance","stepup"];
  const head=`<tr><th>仕入れレベル</th>${periods.map(p=>`<th>${PF_PERIOD_LABELS[p]}</th>`).join("")}</tr>`;
  const rows=levels.map(lv=>`<tr><th style="text-align:left">${PF_LEVEL_LABELS[lv]}</th>${periods.map(p=>`<td>${recommendedQty[lv][p]}</td>`).join("")}</tr>`).join("");
  return `<div class="list-wrap"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}
function pfBuildSalesTable(salesActual,salesForecast){
  const periods=[["d180","180日間"],["d90","90日間"],["d30","30日間"]];
  const head=`<tr><th></th>${periods.map(([,l])=>`<th>${l}</th>`).join("")}</tr>`;
  const rowActual=`<tr><th style="text-align:left">販売数(実績)</th>${periods.map(([k])=>`<td>${salesActual[k]}</td>`).join("")}</tr>`;
  const rowForecast=`<tr><th style="text-align:left">販売数(予測)</th>${periods.map(([k])=>`<td>${salesForecast[k]}</td>`).join("")}</tr>`;
  return `<div class="list-wrap"><table><thead>${head}</thead><tbody>${rowActual}${rowForecast}</tbody></table></div>`;
}
function pfOpenAsinDetailModal(asin){
  const detail=pfGenerateAsinDetail(asin);
  PF_MODAL_DETAIL=detail;
  const modal=document.getElementById("pfAsinModal");
  const body=document.getElementById("pfAsinModalBody");
  if(!modal||!body)return;

  const notes=pfGetAsinNotes();
  const memo=notes[detail.asin]||"";
  const cautionBadges=detail.cautions.length
    ? detail.cautions.map(c=>`<span class="item-tag" style="background:rgba(224,41,63,.08);color:var(--danger)">${escapeHtml(c)}</span>`).join(" ")
    : '<span class="item-tag item-tag-muted">なし</span>';

  body.innerHTML=`
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px">
      <span class="asin-chip" style="font-size:15px">ASIN: ${escapeHtml(detail.asin)}</span>
      <input type="text" id="pfAsinMemoInput" placeholder="メモ" value="${escapeHtml(memo)}" style="flex:1;min-width:180px;height:40px;padding:0 12px;border:1px solid var(--line-strong);border-radius:8px">
      <button type="button" class="copy-btn copy-btn-primary" onclick="pfSaveAsinMemo()">保存</button>
    </div>

    <div class="top-grid" style="margin-top:0">
      <div class="span-4 section-card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>商品情報</div></div>
        <div class="item-stats" style="border:1px solid var(--line);border-radius:10px">
          <div class="stat-item"><span class="stat-label">評価</span><span class="stat-value">${detail.rating!=null?"★"+detail.rating:"-"}</span></div>
          <div class="stat-item"><span class="stat-label">注意事項</span><span class="stat-value">${cautionBadges}</span></div>
          <div class="stat-item"><span class="stat-label">商品名</span><span class="stat-value">${escapeHtml(detail.title)}</span></div>
          <div class="stat-item"><span class="stat-label">ブランド</span><span class="stat-value">${escapeHtml(detail.brand)}</span></div>
          <div class="stat-item"><span class="stat-label">カテゴリ</span><span class="stat-value">${escapeHtml(detail.category)}</span></div>
          <div class="stat-item"><span class="stat-label">日本ASIN</span><span class="stat-value">${detail.jpAsin?escapeHtml(detail.jpAsin):"日本ASIN未取得"}</span></div>
          <div class="stat-item"><span class="stat-label">米ASIN</span><span class="stat-value">${escapeHtml(detail.usAsin)}</span></div>
          <div class="stat-item"><span class="stat-label">JAN</span><span class="stat-value">${detail.jan?escapeHtml(detail.jan):"-"}</span></div>
        </div>
      </div>

      <div class="span-8 section-card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>推奨仕入数</div></div>
        ${pfBuildRecommendedQtyTable(detail.recommendedQty)}
        <div class="item-stats" style="border:1px solid var(--line);border-radius:10px;margin-top:14px">
          <div class="stat-item"><span class="stat-label">セラー数</span><span class="stat-value">${detail.sellerCount}</span></div>
          <div class="stat-item"><span class="stat-label">サイズ感</span><span class="stat-value">${detail.sizeCm}cm</span></div>
          <div class="stat-item"><span class="stat-label">在庫数</span><span class="stat-value">${detail.stock}</span></div>
          <div class="stat-item"><span class="stat-label">返品率</span><span class="stat-value">${detail.returnRate}%</span></div>
        </div>
      </div>

      <div class="span-6 section-card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>keepa風グラフ</div></div>
        ${pfBuildPriceChart(detail.priceHistory)}
        <div class="item-stats" style="border:1px solid var(--line);border-radius:10px;margin-top:14px">
          <div class="stat-item"><span class="stat-label">FBA最安値</span><span class="stat-value">${pfFormatYen(detail.fbaLowest)}</span></div>
          <div class="stat-item"><span class="stat-label">過去3ヶ月FBA最安値</span><span class="stat-value">${pfFormatYen(detail.fbaLowest3mo)}</span></div>
          <div class="stat-item"><span class="stat-label">販売価格($)</span><span class="stat-value">${pfFormatUsd(detail.priceUsd)}</span></div>
          <div class="stat-item"><span class="stat-label">見込み粗利益</span><span class="stat-value"><span class="${detail.profitJpy>=0?"profit-positive":"profit-negative"}">${pfFormatYen(detail.profitJpy)}</span></span></div>
        </div>
      </div>

      <div class="span-6 section-card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>販売数</div></div>
        ${pfBuildSalesTable(detail.salesActual,detail.salesForecast)}
        <div style="margin-top:14px">
          <div class="stat-label" style="margin-bottom:6px">ASINスコア：${detail.asinScore}</div>
          <div style="height:8px;border-radius:4px;background:var(--panel2);overflow:hidden">
            <div style="height:100%;width:${detail.asinScore}%;background:linear-gradient(90deg,var(--accent),var(--amber));border-radius:4px"></div>
          </div>
        </div>
      </div>

      <div class="span-12 section-card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>仕入れ情報</div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px">
          <div class="input-group" style="margin:0">
            <label class="input-label">仕入れ数量</label>
            <input type="number" id="pfModalQty" min="1" value="1" oninput="pfUpdateAsinModalCalc()" style="height:42px;font-family:var(--font-mono)">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">仕入れ価格(¥/個)</label>
            <input type="number" id="pfModalCost" min="0" value="${detail.costJpy}" oninput="pfUpdateAsinModalCalc()" style="height:42px;font-family:var(--font-mono)">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">送料(¥)</label>
            <input type="number" id="pfModalShipping" min="0" value="${detail.shippingJpy}" oninput="pfUpdateAsinModalCalc()" style="height:42px;font-family:var(--font-mono)">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">関税(¥)</label>
            <input type="number" id="pfModalDuty" min="0" value="${detail.dutyJpy}" oninput="pfUpdateAsinModalCalc()" style="height:42px;font-family:var(--font-mono)">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
          <div class="section-card" style="background:rgba(47,95,224,.05);border-color:rgba(47,95,224,.2)">
            <div class="stat-label">収入（見込み入金額）</div>
            <div class="stat-value" id="pfModalIncome" style="font-size:19px;margin-top:6px">¥0</div>
          </div>
          <div class="section-card" style="background:rgba(224,41,63,.05);border-color:rgba(224,41,63,.2)">
            <div class="stat-label">支出（仕入れ・送料・関税）</div>
            <div class="stat-value" id="pfModalExpense" style="font-size:19px;margin-top:6px">¥0</div>
          </div>
          <div class="section-card" style="background:rgba(217,130,11,.08);border-color:rgba(217,130,11,.3)">
            <div class="stat-label">粗利（見込み粗利益額・率）</div>
            <div class="stat-value" id="pfModalGrossProfit" style="font-size:19px;margin-top:6px">¥0（0%）</div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button type="button" class="copy-btn" onclick="closePfAsinModal()">後で仕入れる</button>
      <button type="button" class="copy-btn copy-btn-primary" onclick="pfAddToCartFromModal()">カートに入れる（仕入れリストへ）</button>
    </div>
  `;
  modal.classList.add("visible");
  document.body.style.overflow="hidden";
  pfUpdateAsinModalCalc();
}
function pfUpdateAsinModalCalc(){
  if(!PF_MODAL_DETAIL)return;
  const qty=Math.max(1,Number(document.getElementById("pfModalQty")?.value)||1);
  const cost=Math.max(0,Number(document.getElementById("pfModalCost")?.value)||0);
  const shipping=Math.max(0,Number(document.getElementById("pfModalShipping")?.value)||0);
  const duty=Math.max(0,Number(document.getElementById("pfModalDuty")?.value)||0);
  const income=Math.round(PF_MODAL_DETAIL.depositJpy*qty);
  const expense=Math.round(cost*qty+shipping+duty);
  const grossProfit=income-expense;
  const rate=income?Math.round(grossProfit/income*100):0;
  const incomeEl=document.getElementById("pfModalIncome");
  const expenseEl=document.getElementById("pfModalExpense");
  const profitEl=document.getElementById("pfModalGrossProfit");
  if(incomeEl)incomeEl.textContent=pfFormatYen(income);
  if(expenseEl)expenseEl.textContent=pfFormatYen(expense);
  if(profitEl){
    profitEl.textContent=`${pfFormatYen(grossProfit)}（${rate}%）`;
    profitEl.className="stat-value "+(grossProfit>=0?"profit-positive":"profit-negative");
  }
}
function pfSaveAsinMemo(){
  if(!PF_MODAL_DETAIL)return;
  const input=document.getElementById("pfAsinMemoInput");
  pfSaveAsinNote(PF_MODAL_DETAIL.asin,input?input.value:"");
  showCopyToast("メモを保存しました");
}
function pfAddToCartFromModal(){
  if(!PF_MODAL_DETAIL)return;
  const asin=PF_MODAL_DETAIL.asin;
  const cart=pfGetCart();
  if(!cart.some(c=>c.asin===asin)){
    pfToggleCart(asin);
  }else{
    showCopyToast(`${asin} はすでにカートに入っています`);
  }
  closePfAsinModal();
}
function closePfAsinModal(){
  const modal=document.getElementById("pfAsinModal");
  if(!modal)return;
  modal.classList.remove("visible");
  document.body.style.overflow="";
  PF_MODAL_DETAIL=null;
}
function pfOpenSellerMiningModal(){
  const modal=document.getElementById("pfSellerMiningModal");
  if(!modal)return;
  modal.classList.add("visible");
  document.body.style.overflow="hidden";
}
function closePfSellerMiningModal(){
  const modal=document.getElementById("pfSellerMiningModal");
  if(!modal)return;
  modal.classList.remove("visible");
  document.body.style.overflow="";
}
function pfUpdateCartSummary(){
  const bar=document.getElementById("pfCartSummary");
  if(!bar)return;
  const cart=pfGetCart();
  const count=cart.length;
  const totalCost=cart.reduce((sum,c)=>sum+(Number(c.costJpy)||0),0);
  const totalProfit=cart.reduce((sum,c)=>sum+(Number(c.profitJpy)||0),0);
  document.getElementById("pfCartCount").textContent=count+"件";
  document.getElementById("pfCartCost").textContent=pfFormatYen(totalCost);
  const profitEl=document.getElementById("pfCartProfit");
  profitEl.textContent=pfFormatYen(totalProfit);
  profitEl.className="stat-value "+(totalProfit>=0?"stats-positive":"stats-negative");

  const detail=document.getElementById("pfCartDetail");
  if(!detail)return;
  if(!count){
    detail.innerHTML='<div class="pf-cart-detail-inner"><div class="stats-note">カートにASINを追加すると、ここに利益計算の内訳が表示されます。</div></div>';
    return;
  }
  const totalSales=cart.reduce((s,c)=>s+(Number(c.priceJpy)||0),0);
  const totalAmzFee=cart.reduce((s,c)=>s+(Number(c.amzFeeJpy)||0),0);
  const totalShipping=cart.reduce((s,c)=>s+(Number(c.shippingJpy)||0),0);
  const totalDuty=cart.reduce((s,c)=>s+(Number(c.dutyJpy)||0),0);
  const grossPct=totalSales?Math.round(totalProfit/totalSales*100):0;
  const estTaxRefund=Math.round(totalCost*0.1);
  detail.innerHTML=`<div class="pf-cart-detail-inner">
    <div class="stats-line"><span class="stats-line-label">売上（カート合計）</span><span class="stats-line-value">${pfFormatYen(totalSales)}</span></div>
    <div class="stats-line"><span class="stats-line-label">Amazon手数料（合計）</span><span class="stats-line-value stats-negative">−${pfFormatYen(totalAmzFee)}</span></div>
    <div class="stats-line"><span class="stats-line-label">仕入（合計）</span><span class="stats-line-value stats-negative">−${pfFormatYen(totalCost)}</span></div>
    <div class="stats-line"><span class="stats-line-label">送料（合計）</span><span class="stats-line-value stats-negative">−${pfFormatYen(totalShipping)}</span></div>
    <div class="stats-line"><span class="stats-line-label">関税（合計）</span><span class="stats-line-value stats-negative">−${pfFormatYen(totalDuty)}</span></div>
    <div class="stats-line stats-line-total"><span class="stats-line-label">粗利益</span><span class="stats-line-value ${totalProfit>=0?"stats-positive":"stats-negative"}">${pfFormatYen(totalProfit)}（${grossPct}%）</span></div>
    <div class="stats-line"><span class="stats-line-label">📋 想定消費税還付（仕入分）</span><span class="stats-line-value stats-info">＋${pfFormatYen(estTaxRefund)}</span></div>
    <div class="stats-note">カート内${count}件のASIN情報（売値・手数料・仕入・送料・関税）を合計した参考値です。</div>
  </div>`;
}
function pfToggleCartDetail(){
  const bar=document.getElementById("pfCartSummary");
  if(bar)bar.classList.toggle("expanded");
}


/* ---------- カート ---------- */
function pfRenderCartList(){
  const list=document.getElementById("pfCartList");
  if(!list)return;
  const cart=pfGetCart();
  if(!cart.length){
    list.innerHTML='<div class="empty">カートは空です。ASINリスト／新規ASINリストからカートに追加してください。</div>';
    pfUpdateCartListSummary();
    return;
  }
  list.innerHTML=cart.map(c=>{
    const profitCls=c.profitJpy>=0?"profit-positive":"profit-negative";
    return `<article class="item-card">
      <div class="item-card-head">
        <span class="asin-chip">${escapeHtml(c.asin)}</span>
        <div class="item-meta"><span class="item-tag item-tag-muted">追加日 ${escapeHtml(c.addedAt||"-")}</span></div>
      </div>
      <div class="item-stats">
        <div class="stat-item"><span class="stat-label">商品名</span><span class="stat-value">${escapeHtml(c.title)}</span></div>
        <div class="stat-item"><span class="stat-label">仕入れ値</span><span class="stat-value">${pfFormatYen(c.costJpy)}</span></div>
        <div class="stat-item"><span class="stat-label">利益期待値</span><span class="stat-value"><span class="${profitCls}">${pfFormatYen(c.profitJpy)}</span></span></div>
      </div>
      <div style="padding:0 16px 16px;display:flex;gap:8px">
        <button type="button" class="copy-btn copy-btn-primary" style="flex:1" onclick="pfPurchaseSingleItem('${escapeHtml(c.asin)}')">仕入れる</button>
        <button type="button" class="copy-btn" style="flex:1" onclick="pfRemoveFromCart('${escapeHtml(c.asin)}')">リストから外す</button>
      </div>
    </article>`;
  }).join("");
  pfUpdateCartListSummary();
}
function pfUpdateCartListSummary(){
  const cart=pfGetCart();
  const summary=document.getElementById("pfCartListSummary");
  if(!summary)return;
  const totalCost=cart.reduce((sum,c)=>sum+(Number(c.costJpy)||0),0);
  const totalProfit=cart.reduce((sum,c)=>sum+(Number(c.profitJpy)||0),0);
  summary.textContent=`${cart.length}件 / 仕入れ合計 ${pfFormatYen(totalCost)} / 利益合計見込み ${pfFormatYen(totalProfit)}`;
}
// 「仕入れる」：カートから削除し、仕入れ済みへ移動する。
function pfPurchaseSingleItem(asin){
  let cart=pfGetCart();
  const item=cart.find(c=>c.asin===asin);
  cart=cart.filter(c=>c.asin!==asin);
  pfSaveCart(cart);
  if(item){
    const purchased=pfGetPurchased();
    if(!purchased.some(p=>p.asin===asin)){
      purchased.push({...item,purchasedAt:pfToday()});
      pfSavePurchased(purchased);
    }
  }
  pfRenderCartList();
  pfUpdateCartSummary();
  showCopyToast(`${asin} を仕入れました（仕入れ済みページに移動しました）`);
}
// 「リストから外す」：カートから外す。
function pfRemoveFromCart(asin){
  let cart=pfGetCart();
  cart=cart.filter(c=>c.asin!==asin);
  pfSaveCart(cart);
  pfRenderCartList();
  pfUpdateCartSummary();
  showCopyToast(`${asin} をカートから外しました`);
}
// 上部の一括確定ボタン：カート全体を仕入れ済みへ移動。
function pfFinalizePurchase(){
  const cart=pfGetCart();
  if(!cart.length){showCopyToast("カートが空です");return}
  const purchased=pfGetPurchased();
  cart.forEach(item=>{
    if(!purchased.some(p=>p.asin===item.asin)){
      purchased.push({...item,purchasedAt:pfToday()});
    }
  });
  pfSavePurchased(purchased);
  const count=cart.length;
  pfSaveCart([]);
  pfRenderCartList();
  pfUpdateCartSummary();
  showCopyToast(`${count}件を仕入れました（仕入れ済みページに移動しました）`);
}

/* ---------- 仕入れ済み（LAS登録） ---------- */
function pfRenderPurchased(){
  const list=document.getElementById("pfPurchasedList");
  const summary=document.getElementById("pfPurchasedSummary");
  if(!list)return;
  const purchased=pfGetPurchased();
  if(summary)summary.textContent=`${purchased.length}件`;
  if(!purchased.length){
    list.innerHTML='<div class="empty">仕入れ済みのASINはまだありません。カート画面で「仕入れる」を押すとここに表示されます。</div>';
    return;
  }
  list.innerHTML=purchased.slice().reverse().map(p=>{
    const profitCls=p.profitJpy>=0?"profit-positive":"profit-negative";
    const registered=!!p.lasRegistered;
    const safeAsin=escapeHtml(p.asin);
    return `<article class="item-card">
      <div class="item-card-head">
        <span class="asin-chip">${safeAsin}</span>
        <div class="item-meta">
          <span class="item-tag item-tag-muted">仕入れ日 ${escapeHtml(p.purchasedAt||"-")}</span>
          ${registered?'<span class="item-tag">LAS登録済み</span>':""}
        </div>
      </div>
      <div class="item-stats">
        <div class="stat-item"><span class="stat-label">商品名</span><span class="stat-value">${escapeHtml(p.title)}</span></div>
        <div class="stat-item"><span class="stat-label">参考仕入れ値</span><span class="stat-value">${pfFormatYen(p.costJpy)}</span></div>
        <div class="stat-item"><span class="stat-label">利益期待値</span><span class="stat-value"><span class="${profitCls}">${pfFormatYen(p.profitJpy)}</span></span></div>
      </div>
      <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="input-group" style="margin:0">
            <label class="input-label">仕入れ価格(¥)</label>
            <input type="number" data-asin="${safeAsin}" data-field="purchasePrice" value="${p.purchasePrice??""}" ${registered?"disabled":""} onchange="pfUpdatePurchasedField(this)" style="height:38px;font-family:var(--font-mono)">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">仕入れ店舗</label>
            <input type="text" data-asin="${safeAsin}" data-field="purchaseStore" value="${escapeHtml(p.purchaseStore||"")}" ${registered?"disabled":""} onchange="pfUpdatePurchasedField(this)" style="height:38px">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">数量</label>
            <input type="number" min="1" data-asin="${safeAsin}" data-field="quantity" value="${p.quantity??1}" ${registered?"disabled":""} onchange="pfUpdatePurchasedField(this)" style="height:38px;font-family:var(--font-mono)">
          </div>
          <div class="input-group" style="margin:0">
            <label class="input-label">備考</label>
            <input type="text" data-asin="${safeAsin}" data-field="notes" value="${escapeHtml(p.notes||"")}" ${registered?"disabled":""} onchange="pfUpdatePurchasedField(this)" style="height:38px">
          </div>
        </div>
        <button type="button" class="copy-btn ${registered?"":"copy-btn-primary"}" style="width:100%" ${registered?"disabled":""} onclick="pfRegisterToLas('${safeAsin}')">${registered?"LAS登録済み":"LASに登録"}</button>
      </div>
    </article>`;
  }).join("");
}
// 仕入れ価格・店舗・数量・備考の入力を保存する
function pfUpdatePurchasedField(inputEl){
  const asin=inputEl.getAttribute("data-asin");
  const field=inputEl.getAttribute("data-field");
  const purchased=pfGetPurchased();
  const item=purchased.find(p=>p.asin===asin);
  if(!item)return;
  item[field]=(field==="purchasePrice"||field==="quantity")?Number(inputEl.value)||0:inputEl.value;
  pfSavePurchased(purchased);
}
// 「LASに登録」：現時点ではLAS本体との連携が未接続のため、入力内容を確定してデモ登録する。
function pfRegisterToLas(asin){
  const purchased=pfGetPurchased();
  const item=purchased.find(p=>p.asin===asin);
  if(!item)return;
  if(!item.purchasePrice||!item.purchaseStore){
    showCopyToast("仕入れ価格と仕入れ店舗を入力してください");
    return;
  }
  item.lasRegistered=true;
  item.lasRegisteredAt=pfToday();
  pfSavePurchased(purchased);
  pfRenderPurchased();
  showCopyToast(`${asin} をLASに登録しました（デモ動作：実際のLAS連携は未接続です）`);
}

/* ---------- お気に入り ---------- */
function pfRenderFavorites(){
  const favorites=pfGetFavorites();
  const asinFavs=favorites.filter(f=>f.type==="asin");
  const sellerFavs=favorites.filter(f=>f.type==="seller");

  const asinTbody=document.getElementById("pfFavoriteAsinList");
  const asinEmpty=document.getElementById("pfFavoriteAsinEmpty");
  if(asinTbody){
    if(!asinFavs.length){
      asinTbody.innerHTML="";
      if(asinEmpty)asinEmpty.classList.remove("hidden");
    }else{
      if(asinEmpty)asinEmpty.classList.add("hidden");
      const cart=pfGetCart();
      const cartAsins=new Set(cart.map(c=>c.asin));
      asinTbody.innerHTML=asinFavs.map(f=>pfAsinResearchRowHtml(pfGenerateAsinDetail(f.id),cartAsins.has(f.id))).join("");
    }
  }

  const sellerTbody=document.getElementById("pfFavoriteSellerList");
  const sellerEmpty=document.getElementById("pfFavoriteSellerEmpty");
  if(sellerTbody){
    if(!sellerFavs.length){
      sellerTbody.innerHTML="";
      if(sellerEmpty)sellerEmpty.classList.remove("hidden");
    }else{
      if(sellerEmpty)sellerEmpty.classList.add("hidden");
      sellerTbody.innerHTML=sellerFavs.map(f=>pfSellerRowHtml(f.data)).join("");
    }
  }
}

/* ---------- ⑤ アプリ探索ASIN ---------- */
function pfRenderAppAsins(){
  const list=document.getElementById("pfAppAsinList");
  if(!list)return;
  const items=pfGetAppAsins();
  if(!items.length){
    list.innerHTML='<div class="empty">アプリから送信されたASINはまだありません。</div>';
    return;
  }
  list.innerHTML=`<div class="panel-toolbar" style="margin-bottom:14px">
    <div class="toolbar-group"><label class="select-all-label"><input type="checkbox" id="pfAppAsinSelectAll" onchange="pfToggleSelectAllAppAsins(this.checked)"> 全選択</label></div>
    <div class="toolbar-group toolbar-group-end" style="gap:10px">
      <button type="button" class="copy-btn" onclick="pfSearchAllAppAsins()">全ASINを検索</button>
      <button type="button" class="copy-btn copy-btn-primary" onclick="pfSearchSelectedAppAsins()">選択したASINを検索</button>
    </div>
  </div>`+items.map(item=>`
    <div class="announce-item" style="grid-template-columns:24px 110px 1fr">
      <input type="checkbox" class="pf-app-asin-check" value="${escapeHtml(item.asin)}">
      <div class="announce-item-date">${escapeHtml(item.receivedAt)}</div>
      <div class="asin-chip" style="justify-self:start">${escapeHtml(item.asin)}</div>
    </div>
  `).join("");
}
function pfToggleSelectAllAppAsins(checked){
  document.querySelectorAll(".pf-app-asin-check").forEach(cb=>{cb.checked=checked});
}
function pfShowAsinDetailsForAsins(asins){
  if(!asins.length){showCopyToast("対象のASINがありません");return}
  switchProfinderTab("newresearch");
  switchNewResearchSubTab("search");
  pfSwitchSearchMode("asinsearch");
  pfSwitchAsinSearchSubMode("byasin");
  const cart=pfGetCart();
  const cartAsins=new Set(cart.map(c=>c.asin));
  const items=asins.map(pfGenerateAsinDetail);
  const empty=document.getElementById("pfAsinDetailResultsEmpty");
  const wrap=document.getElementById("pfAsinDetailResultsWrap");
  const tbody=document.getElementById("pfAsinDetailResults");
  if(tbody)tbody.innerHTML=items.map(a=>pfAsinResearchRowHtml(a,cartAsins.has(a.asin))).join("");
  if(empty)empty.classList.add("hidden");
  if(wrap)wrap.classList.remove("hidden");
  showCopyToast(`ASIN${asins.length}件の詳細を表示しました`);
}
function pfSearchAllAppAsins(){
  const items=pfGetAppAsins();
  pfShowAsinDetailsForAsins(items.map(i=>i.asin));
}
function pfSearchSelectedAppAsins(){
  const checked=Array.from(document.querySelectorAll(".pf-app-asin-check:checked")).map(cb=>cb.value);
  if(!checked.length){showCopyToast("ASINを選択してください");return}
  pfShowAsinDetailsForAsins(checked);
}

/* ---------- 初期化 ---------- */
function pfInit(){
  pfRenderSellerList();
  pfRenderAsinList();
  pfRenderSellerResults();
  pfRenderAsinBySellerResults();
  pfUpdateCartSummary();
  switchNewResearchSubTab("asinlist");
}

/* ---------- リサーチ表：ホバーで出る左右スクロール矢印 ---------- */
function pfScrollTable(btn,dir){
  const wrap=btn.closest(".list-card")?.querySelector(".list-wrap");
  if(wrap)wrap.scrollBy({left:dir*360,behavior:"smooth"});
}
