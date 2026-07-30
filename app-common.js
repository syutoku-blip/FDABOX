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

/* ---------- データ定義 (シート列構成) ---------- */
const RELATION_HEADERS=["ASIN","ブランド","カテゴリ","30日販売数","出品セラー数","推奨仕入れ数","日本仕入JPY","売値USD","TWAPグラフ","TWAP","想定送料JPY","想定関税JPY","AMZ想定手数料JPY","入金額予想JPY","利益期待値JPY"];
const OVERLAY_HEADERS=["ASIN","ブランド","カテゴリ","黒字化％","赤字化％","ボラティリティ指数","バンド指数","30日販売数","出品セラー数","推奨仕入れ数","日本仕入JPY","売値USD","想定送料JPY","想定関税JPY","AMZ手数料JPY","入金額予想JPY","利益期待値JPY"];
const FIELD_ALIASES={
  "ASIN":["asin","ASIN","Asin","商品ASIN"],
  "ブランド":["brand","ブランド","brandName"],
  "カテゴリ":["category","カテゴリ","カテゴリー"],
  "30日販売数":["sales30","30日販売数","３０日販売数","sales","monthlySales"],
  "出品セラー数":["sellerCount","出品セラー数","セラー数","sellers","seller"],
  "推奨仕入れ数":["recommendedPurchaseCount","推奨仕入れ数","推奨仕入数","purchaseQty"],
  "日本仕入JPY":["jpPurchasePrice","日本仕入JPY","日本仕入","仕入れ価格","仕入価格JPY","costJpy","purchasePriceJpy"],
  "売値USD":["sellingPriceUsd","売値USD","売値","販売価格USD","priceUsd","sellingPrice","price"],
  "売値JPY":["sellingPriceJpy","売値JPY","現在価格JPY","日本販売価格","日本価格","販売価格JPY","japanPriceJpy","priceJpy","currentPriceJpy"],
  "TWAPグラフ":["twapGraph","TWAPグラフ","graph","グラフ","twapHistory","priceHistory","chart","chartData"],
  "TWAP":["twap","TWAP","twapRate","TWAP率","twapPrice","twapJpy"],
  "想定送料JPY":["estimatedShippingJpy","想定送料JPY","想定送料","送料","shipping","shippingFee","shippingJpy"],
  "想定関税JPY":["estimatedDutyJpy","想定関税JPY","想定関税","関税","duty","tariff","dutyJpy"],
  "AMZ想定手数料JPY":["amzFeeJpy","AMZ想定手数料JPY","想定手数料JPY","想定手数料","amazonFeeJpy","estimatedAmzFeeJpy","amzFee"],
  "入金額予想JPY":["depositForecastJpy","入金額予想JPY","AMZ入金額予想","AMZ入金額予想JPY","amazonDepositForecast","depositForecast"],
  "利益期待値JPY":["expectedProfitJpy","利益期待値JPY","利益期待値","利益","profit","profitJpy"],
  "黒字化％":["profitRate","黒字化％","黒字化率","blackRate"],
  "赤字化％":["lossRate","赤字化％","赤字化率","redRate"],
  "ボラティリティ指数":["volatilityIndex","ボラティリティ指数","volatility"],
  "バンド指数":["bandIndex","バンド指数","band"],
  "AMZ手数料JPY":["amzFeeJpySimple","AMZ手数料JPY","amzFeeJpy"],
};
const RELATION_ARRAY_INDEX={
  "ASIN":0,
  "ブランド":1,
  "カテゴリ":2,
  "30日販売数":3,
  "出品セラー数":4,
  "推奨仕入れ数":5,
  "日本仕入JPY":6,
  "売値USD":7,
  "売値JPY":8,
  "TWAPグラフ":9,
  "TWAP":10,
  "想定送料JPY":11,
  "想定関税JPY":12,
  "AMZ想定手数料JPY":13,
  "入金額予想JPY":14,
  "利益期待値JPY":15
};
const CARD_STAT_FIELDS=["30日販売数","出品セラー数","推奨仕入れ数","日本仕入JPY","売値USD","想定送料JPY","想定関税JPY","AMZ想定手数料JPY","入金額予想JPY","利益期待値JPY"];

/* ---------- 汎用ユーティリティ ---------- */
function extractItems(data,keys){for(const key of keys){const value=data?.[key];if(Array.isArray(value))return value;if(value&&Array.isArray(value.items))return value.items;if(value&&Array.isArray(value.rows))return value.rows}return []}
function toNumber(value){if(value==null||value==="")return NaN;if(typeof value==="number")return value;const text=String(value).replace(/[￥¥$,％%]/g,"").replace(/,/g,"").trim();const n=Number(text);return Number.isFinite(n)?n:NaN}
function formatNumber(num,digits=0){return Number(num).toLocaleString("ja-JP",{minimumFractionDigits:digits,maximumFractionDigits:digits})}
function normalizeHeader(value){return String(value||"").replace(/[Ａ-Ｚａ-ｚ０-９]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).replace(/\s/g,"").toLowerCase()}
function getField(item,keys){for(const key of keys){if(item&&item[key]!=null&&item[key]!=="")return item[key]}return "-"}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function sumFinite(values){const nums=values.filter(Number.isFinite);return nums.length?nums.reduce((a,b)=>a+b,0):NaN}
function getFirstNumber(item,keys){if(!item||Array.isArray(item))return NaN;for(const key of keys){const n=toNumber(item[key]);if(Number.isFinite(n))return n}const normalized=keys.map(normalizeHeader);for(const key of Object.keys(item)){if(normalized.includes(normalizeHeader(key))){const n=toNumber(item[key]);if(Number.isFinite(n))return n}}return NaN}
function clampNum(v,lo,hi){return Math.max(lo,Math.min(hi,v))}

/* ---------- セル値の取得・整形 ---------- */
function getColumnValue(item,header,index,isRelation=false){if(Array.isArray(item)){const fixedIndex=isRelation&&RELATION_ARRAY_INDEX[header]!=null?RELATION_ARRAY_INDEX[header]:index;return item[fixedIndex]??"-"}const aliases=FIELD_ALIASES[header]||[header];for(const key of aliases){if(item&&item[key]!=null&&item[key]!=="")return item[key]}const normalizedAliases=aliases.map(normalizeHeader);if(item){for(const key of Object.keys(item)){if(normalizedAliases.includes(normalizeHeader(key)))return item[key]}}return "-"}
function getCellClass(header){const h=String(header||"");if(/ASIN/i.test(h))return "asin-cell";if(/TWAPグラフ/i.test(h))return "twap-cell";if(/価格|入金|送料|関税|仕入|利益|売値|JPY|USD|price|cost|profit/i.test(h))return "price-cell";if(/販売数|セラー|仕入れ数|率|sales|rate/i.test(h))return "sales-cell";return ""}
function formatCellValue(value,header){if(value==null||value==="")return "-";const h=String(header||"");if(h==="利益期待値JPY"){const n=toNumber(value);if(Number.isFinite(n)){const cls=n>=0?"profit-positive":"profit-negative";const sign=n<0?"-":"";return `<span class="${cls}">${sign}¥${Math.round(Math.abs(n)).toLocaleString("ja-JP")}</span>`}}if(/JPY|送料|関税|入金|利益|日本仕入/.test(h)){const n=toNumber(value);if(Number.isFinite(n))return `¥${Math.round(n).toLocaleString("ja-JP")}`}if(/USD|売値/.test(h)){const n=toNumber(value);if(Number.isFinite(n))return `$${formatNumber(n,2)}`}if(h==="TWAP"){const n=toNumber(value);if(Number.isFinite(n)){return Math.abs(n)<=1?`${formatNumber(n*100,1)}%`:formatNumber(n,2)}}if(String(header).includes("グラフ")&&/^https?:\/\//.test(String(value))){const safe=escapeHtml(value);return `<a href="${safe}" target="_blank" rel="noopener">表示</a>`}return escapeHtml(value)}
// オーバーレイはシートの表示をそのまま使う(¥や$などの独自整形を行わない)。利益期待値JPYのみ符号で色分けする。
function formatOverlayCellValue(value,header){if(value==null||value==="")return "-";const h=String(header||"");const text=String(value);if(h==="利益期待値JPY"){const n=toNumber(text);if(Number.isFinite(n)){const cls=n>=0?"profit-positive":"profit-negative";return `<span class="${cls}">${escapeHtml(text)}</span>`}}return escapeHtml(text)}
function formatRelationCell(item,header,index){if(header==="TWAPグラフ")return renderTwapChart(item);if(header==="TWAP"){const m=computeTwapMetrics(item);return escapeHtml(m.twapPercentText||"-")}return formatCellValue(getColumnValue(item,header,index,true),header)}

/* ---------- TWAP指標の計算 ---------- */
function computeTwapMetrics(item){const purchase=toNumber(getColumnValue(item,"日本仕入JPY",6,true));const shipping=toNumber(getColumnValue(item,"想定送料JPY",11,true));const duty=toNumber(getColumnValue(item,"想定関税JPY",12,true));const amzFee=toNumber(getColumnValue(item,"AMZ想定手数料JPY",13,true));const breakeven=sumFinite([purchase,shipping,duty,amzFee]);const currentJpy=getCurrentJpy(item);const currentUsd=toNumber(getColumnValue(item,"売値USD",7,true));const twapRaw=getColumnValue(item,"TWAP",10,true);const twapValue=calcTwapPrice(currentJpy,twapRaw);const history=parseHistory(getColumnValue(item,"TWAPグラフ",9,true));const twapPercentText=twapDisplayText(twapRaw);return {breakeven,currentJpy,currentUsd,twapRaw,twapValue,history,twapPercentText}}
function parseTwapRate(value){const text=String(value??"").trim();if(!text||text==="-")return NaN;const hasPercent=text.includes("%")||text.includes("％");const n=toNumber(text);if(!Number.isFinite(n))return NaN;return hasPercent?n/100:n}
function calcTwapPrice(currentJpy,twapRaw){const n=parseTwapRate(twapRaw);if(!Number.isFinite(n)||!Number.isFinite(currentJpy))return NaN;return currentJpy*(1-n)}
function twapDisplayText(twapRaw){const text=String(twapRaw??"").trim();if(!text||text==="-")return "";if(text.includes("%")||text.includes("％"))return text;const n=toNumber(text);if(!Number.isFinite(n))return "";return Math.abs(n)<=1?`${formatNumber(n*100,2)}%`:`${formatNumber(n,2)}%`}
function getCurrentJpy(item){const direct=getFirstNumber(item,["currentPriceJpy","現在価格JPY","日本販売価格","日本価格","販売価格JPY","japanPriceJpy","priceJpy","sellingPriceJpy"]);if(Number.isFinite(direct))return direct;if(Array.isArray(item)){const jCol=toNumber(item[RELATION_ARRAY_INDEX["売値JPY"]]);if(Number.isFinite(jCol))return jCol}return NaN}
function parseHistory(value){if(Array.isArray(value))return value.map(toNumber).filter(Number.isFinite);if(value&&typeof value==="object")return Object.values(value).map(toNumber).filter(Number.isFinite);const text=String(value??"").trim();if(!text||text==="-")return [];if(/^https?:\/\//.test(text))return [];return text.split(/[、,\s|/]+/).map(toNumber).filter(Number.isFinite)}

/* ---------- TWAPグラフ (Keepa風ラインチャート) ---------- */
function renderTwapChart(item){const m=computeTwapMetrics(item);if(!Number.isFinite(m.breakeven)&&!Number.isFinite(m.currentJpy)&&!Number.isFinite(m.twapValue)&&!m.history.length)return '<span class="twap-empty">-</span>';return buildKeepaChart(m)}
function buildKeepaChart({history,breakeven,currentJpy,currentUsd,twapValue}){
  const W=380,H=210,padL=14,padR=14,padT=22,padB=20;
  const priceSeries=(history&&history.length>1)?history:(Number.isFinite(currentJpy)?[currentJpy]:[]);
  const allValues=[...priceSeries,breakeven,twapValue].filter(Number.isFinite);
  if(!allValues.length)return '<span class="twap-empty">-</span>';
  const min=Math.min(...allValues),max=Math.max(...allValues);
  const pad=(max-min)*0.2||Math.max(Math.abs(max)*0.08,1);
  const lo=min-pad,hi=max+pad;
  const innerW=W-padL-padR,innerH=H-padT-padB;
  const yTop=padT+2,yBottom=H-padB-2;
  const x=i=>priceSeries.length<=1?padL:padL+i*innerW/(priceSeries.length-1);
  const yRaw=v=>padT+(1-(v-lo)/(hi-lo||1))*innerH;
  const y=v=>clampNum(yRaw(v),yTop,yBottom);
  const fmt=v=>`¥${Math.round(v).toLocaleString("ja-JP")}`;

  let priceSvg="";
  if(priceSeries.length>1){
    const linePts=priceSeries.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
    const areaPts=`${padL},${yBottom} ${linePts} ${x(priceSeries.length-1)},${yBottom}`;
    priceSvg=`<polygon class="price-area" points="${areaPts}"></polygon><polyline class="price-line" points="${linePts}"></polyline>`;
  }else if(priceSeries.length===1){
    const py=y(priceSeries[0]);
    priceSvg=`<polygon class="price-area" points="${padL},${yBottom} ${padL},${py} ${W-padR},${py} ${W-padR},${yBottom}"></polygon><line class="price-line" x1="${padL}" y1="${py}" x2="${W-padR}" y2="${py}"></line>`;
  }

  const markers=[];
  if(Number.isFinite(breakeven))markers.push({key:"breakeven",lineY:y(breakeven),name:"損益分岐点",amount:fmt(breakeven),color:"var(--chart-breakeven)",cls:"ref-label-breakeven",side:"end"});
  if(Number.isFinite(twapValue))markers.push({key:"twap",lineY:y(twapValue),name:"TWAP",amount:fmt(twapValue),color:"var(--chart-twap)",cls:"ref-label-twap",side:"start"});
  if(Number.isFinite(currentJpy)){
    const cx=priceSeries.length>1?x(priceSeries.length-1):(W-padR);
    const usdText=Number.isFinite(currentUsd)?` ($${formatNumber(currentUsd,2)})`:"";
    markers.push({key:"current",lineY:y(currentJpy),name:"販売価格",amount:`${fmt(currentJpy)}${usdText}`,color:"var(--chart-line)",cls:"ref-label-current",side:cx>(W/2)?"end":"start",cx});
  }
  const labelPositions=declutterLabels(markers.map(m=>m.lineY),14,yTop+6,yBottom-2);

  let refSvg="";
  markers.forEach((m,i)=>{
    const labelY=labelPositions[i];
    if(m.key==="current"){
      const cx=m.cx;
      const anchorEnd=m.side==="end";
      const labelX=anchorEnd?clampNum(cx-6,padL+2,W-padR-2):clampNum(cx+6,padL+2,W-padR-2);
      refSvg+=`<line class="hit-line" x1="${padL}" y1="${m.lineY}" x2="${W-padR}" y2="${m.lineY}"><title>${m.name} ${m.amount}</title></line>`;
      refSvg+=`<circle class="price-dot" cx="${cx}" cy="${m.lineY}" r="3.4"><title>${m.name} ${m.amount}</title></circle>`;
      refSvg+=`<text class="ref-name ${m.cls}" x="${labelX}" y="${labelY}" text-anchor="${anchorEnd?"end":"start"}">${m.name}</text>`;
    }else{
      refSvg+=`<line class="ref-line" x1="${padL}" y1="${m.lineY}" x2="${W-padR}" y2="${m.lineY}" stroke="${m.color}"></line>`;
      refSvg+=`<line class="hit-line" x1="${padL}" y1="${m.lineY}" x2="${W-padR}" y2="${m.lineY}">${m.amount?`<title>${m.name} ${m.amount}</title>`:""}</line>`;
      const anchorEnd=m.side==="end";
      const labelX=anchorEnd?W-padR:padL;
      refSvg+=`<text class="ref-name ${m.cls}" x="${labelX}" y="${labelY}" text-anchor="${m.side}">${m.name}</text>`;
    }
  });

  return `<svg class="twap-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="TWAP推移グラフ">
  <defs>
    <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2f5fe0" stop-opacity="0.28"></stop>
      <stop offset="100%" stop-color="#2f5fe0" stop-opacity="0"></stop>
    </linearGradient>
  </defs>
  ${priceSvg}
  ${refSvg}
</svg>`;
}
function declutterLabels(values,minGap,top,bottom){
  const order=values.map((v,i)=>i).sort((a,b)=>values[a]-values[b]);
  const sorted=order.map(i=>values[i]);
  for(let i=1;i<sorted.length;i++){if(sorted[i]-sorted[i-1]<minGap)sorted[i]=sorted[i-1]+minGap}
  const overflow=sorted.length?sorted[sorted.length-1]-bottom:0;
  if(overflow>0){for(let i=0;i<sorted.length;i++)sorted[i]-=overflow}
  for(let i=0;i<sorted.length;i++)sorted[i]=Math.max(sorted[i],top);
  const result=new Array(values.length);
  order.forEach((originalIndex,i)=>{result[originalIndex]=sorted[i]});
  return result;
}

/* ---------- 一覧描画 (テーブル & カード同時生成) ---------- */
function renderMemberItems(items,updatedDate){items=Array.isArray(items)?items:[];document.getElementById("updatedDate").innerText=updatedDate||"-";const tbody=document.getElementById("itemTable");const grid=document.getElementById("itemGrid");const empty=document.getElementById("emptyMessage");if(!items.length){tbody.innerHTML="";grid.innerHTML="";empty.innerText="表示できるデータがありません。";empty.classList.remove("hidden");return}empty.classList.add("hidden");tbody.innerHTML=items.map(item=>{const asin=getColumnValue(item,"ASIN",0,true);return `<tr>${buildCheckboxCell("relation",asin)}${RELATION_HEADERS.map((header,index)=>`<td class="${getCellClass(header)}">${formatRelationCell(item,header,index)}</td>`).join("")}</tr>`}).join("");grid.innerHTML=items.map(item=>buildRelationCard(item)).join("");resetSelectAll("relation");refreshScrollIndicators()}
function buildCheckboxCell(panel,asin){const safe=escapeHtml(asin);return `<td class="check-col"><input type="checkbox" class="asin-check" data-panel="${panel}" data-asin="${safe}" value="${safe}" aria-label="${safe}を選択"></td>`}
function buildRelationCard(item){const asin=getColumnValue(item,"ASIN",0,true);const brand=getColumnValue(item,"ブランド",1,true);const category=getColumnValue(item,"カテゴリ",2,true);const metrics=computeTwapMetrics(item);const chart=buildKeepaChart(metrics);const brandTag=brand&&brand!=="-"?`<span class="item-tag">${escapeHtml(brand)}</span>`:"";const categoryTag=category&&category!=="-"?`<span class="item-tag item-tag-muted">${escapeHtml(category)}</span>`:"";const twapStat=`<div class="stat-item"><span class="stat-label">TWAP</span><span class="stat-value">${escapeHtml(metrics.twapPercentText||"-")}</span></div>`;const stats=twapStat+CARD_STAT_FIELDS.map(f=>`<div class="stat-item"><span class="stat-label">${escapeHtml(f)}</span><span class="stat-value">${formatCellValue(getColumnValue(item,f,null,true),f)}</span></div>`).join("");const safeAsin=escapeHtml(asin);return `<article class="item-card">
  <div class="item-card-head">
    <label class="asin-check-label"><input type="checkbox" class="asin-check" data-panel="relation" data-asin="${safeAsin}" value="${safeAsin}" aria-label="${safeAsin}を選択"><span class="asin-chip">${safeAsin}</span></label>
    <div class="item-meta">${brandTag}${categoryTag}</div>
  </div>
  <div class="item-chart">
    <div class="item-chart-label">TWAP推移<span class="help-tip" tabindex="0" data-tip="損益分岐点ラインがTWAPラインより下にある場合、現在価格が過去の平均価格（TWAP）まで回復すれば利益が見込めるため、黒字化の期待値が高い商品と判断できます。">?</span></div>
    ${chart}
  </div>
  <div class="item-stats">${stats}</div>
</article>`}
function renderOverlayItems(items,updatedDate){items=Array.isArray(items)?items:[];document.getElementById("overlayUpdatedDate").innerText=updatedDate||"-";const tbody=document.getElementById("overlayItemTable");const grid=document.getElementById("overlayItemGrid");const empty=document.getElementById("overlayEmptyMessage");if(!items.length){tbody.innerHTML="";grid.innerHTML="";empty.innerText="表示できるデータがありません。";empty.classList.remove("hidden");return}empty.classList.add("hidden");tbody.innerHTML=items.map(item=>{const asin=getColumnValue(item,"ASIN",0);return `<tr>${buildCheckboxCell("overlay",asin)}${OVERLAY_HEADERS.map((header,index)=>`<td class="${getCellClass(header)}">${formatOverlayCellValue(getColumnValue(item,header,index),header)}</td>`).join("")}</tr>`}).join("");grid.innerHTML=items.map(item=>buildOverlayCard(item)).join("");resetSelectAll("overlay");refreshScrollIndicators()}
const FIELD_HELP_TIPS={
  "ボラティリティ指数":"価格の標準偏差 ÷ 平均価格 × 100",
  "バンド指数":"(現在の価格 − 90日最安) ÷ (90日最高 − 90日最安) × 100"
};
function helpTipHtml(header){const tip=FIELD_HELP_TIPS[header];return tip?`<span class="help-tip" tabindex="0" data-tip="${escapeHtml(tip)}">?</span>`:""}
function buildOverlayCard(item){const asin=getColumnValue(item,"ASIN",0);const safeAsin=escapeHtml(asin);const stats=OVERLAY_HEADERS.slice(1).map((header,i)=>`<div class="stat-item"><span class="stat-label">${escapeHtml(header)}${helpTipHtml(header)}</span><span class="stat-value">${formatOverlayCellValue(getColumnValue(item,header,i+1),header)}</span></div>`).join("");return `<article class="item-card item-card-compact">
  <div class="item-card-head"><label class="asin-check-label"><input type="checkbox" class="asin-check" data-panel="overlay" data-asin="${safeAsin}" value="${safeAsin}" aria-label="${safeAsin}を選択"><span class="asin-chip">${safeAsin}</span></label></div>
  <div class="item-stats">${stats}</div>
</article>`}

/* ---------- タブ / 表示モード切り替え ---------- */
function switchResearchTab(type){
  const panelIds={relation:"relationPanel",overlay:"overlayPanel"};
  Object.keys(panelIds).forEach(key=>{
    const panel=document.getElementById(panelIds[key]);
    if(panel)panel.classList.toggle("hidden",key!==type);
    const tab=document.getElementById(key+"Tab");
    if(tab){tab.classList.toggle("active",key===type);tab.setAttribute("aria-selected",String(key===type))}
  });
  updateNavArrowPosition();
  refreshScrollIndicators();
}
// 在庫・利益ダッシュボードページ(ホーム/仕入れリスト/棚卸/設定)のタブ切り替え
function switchDashboardTab(type){
  const panelIds={home:"homePanel",purchase:"purchasePanel",inventory:"inventoryPanel",settings:"settingsPanel"};
  Object.keys(panelIds).forEach(key=>{
    const panel=document.getElementById(panelIds[key]);
    if(panel)panel.classList.toggle("hidden",key!==type);
    const tab=document.getElementById(key+"Tab");
    if(tab){tab.classList.toggle("active",key===type);tab.setAttribute("aria-selected",String(key===type))}
  });
}
function setViewMode(mode){document.getElementById("dashboard").setAttribute("data-view",mode);document.querySelectorAll(".view-switch-btn").forEach(btn=>btn.classList.toggle("active",btn.dataset.mode===mode));updateTableNavVisibility();refreshScrollIndicators()}

/* ---------- 横スクロールの進捗表示(非操作・視認用) ---------- */
function updateScrollIndicator(wrapId,thumbId,fadeId){
  const wrap=document.getElementById(wrapId);
  const thumb=document.getElementById(thumbId);
  const fade=document.getElementById(fadeId);
  if(!wrap||!thumb)return;
  const progress=thumb.parentElement;
  const scrollable=wrap.scrollWidth>wrap.clientWidth+2;
  if(progress)progress.classList.toggle("hidden",!scrollable);
  const nearEnd=scrollable&&(wrap.scrollLeft+wrap.clientWidth>=wrap.scrollWidth-2);
  if(fade)fade.classList.toggle("hidden",!scrollable||nearEnd);
  if(!scrollable)return;
  const thumbWidthPct=Math.max(8,(wrap.clientWidth/wrap.scrollWidth)*100);
  const maxScroll=wrap.scrollWidth-wrap.clientWidth;
  const scrollRatio=maxScroll>0?wrap.scrollLeft/maxScroll:0;
  thumb.style.width=thumbWidthPct+"%";
  thumb.style.left=(scrollRatio*(100-thumbWidthPct))+"%";
}
function refreshScrollIndicators(){
  updateScrollIndicator("relationListWrap","relationScrollThumb","relationEdgeFade");
  updateScrollIndicator("overlayListWrap","overlayScrollThumb","overlayEdgeFade");
}
function initScrollIndicators(){
  [["relationListWrap","relationScrollThumb","relationEdgeFade"],["overlayListWrap","overlayScrollThumb","overlayEdgeFade"]].forEach(([wrapId,thumbId,fadeId])=>{
    const wrap=document.getElementById(wrapId);
    if(!wrap)return;
    wrap.addEventListener("scroll",()=>updateScrollIndicator(wrapId,thumbId,fadeId),{passive:true});
  });
}

/* ---------- 表の左右スクロール & 上へ戻る ---------- */
function scrollToTop(){window.scrollTo({top:0,behavior:"smooth"})}
function scrollActiveTable(dir){const wrap=document.querySelector(".research-panel:not(.hidden) .list-wrap");if(wrap)wrap.scrollBy({left:dir*320,behavior:"smooth"})}
function updateTableNavVisibility(){
  const topBtn=document.getElementById("tableNav");
  if(topBtn)topBtn.classList.toggle("visible",window.scrollY>320);
  updateNavArrowPosition();
}
function updateNavArrowPosition(){
  const leftBtn=document.querySelector(".nav-left-btn");
  const rightBtn=document.querySelector(".nav-right-btn");
  if(!leftBtn||!rightBtn)return;
  const wrap=document.querySelector(".research-panel:not(.hidden) .list-wrap");
  const sideBtns=document.querySelectorAll(".nav-side");
  if(!wrap){sideBtns.forEach(el=>el.classList.remove("visible"));return}

  const tableRect=wrap.getBoundingClientRect();
  const vh=window.innerHeight;
  const visibleTop=Math.max(tableRect.top,0);
  const visibleBottom=Math.min(tableRect.bottom,vh);
  const isOnScreen=visibleBottom-visibleTop>40;
  sideBtns.forEach(el=>el.classList.toggle("visible",isOnScreen));
  if(!isOnScreen)return;

  // 縦位置：今画面に見えている表の範囲の中央に追従させる
  const btnH=leftBtn.offsetHeight||46;
  const centerY=(visibleTop+visibleBottom)/2;
  const top=Math.round(Math.min(Math.max(centerY-btnH/2,8),vh-btnH-8));
  leftBtn.style.top=top+"px";
  rightBtn.style.top=top+"px";
  leftBtn.style.transform="none";
  rightBtn.style.transform="none";

  // 横位置：表のすぐ外側
  const gap=24;
  const btnW=leftBtn.offsetWidth||46;
  leftBtn.style.left=Math.max(8,Math.round(tableRect.left-btnW-gap))+"px";
  rightBtn.style.left=Math.min(window.innerWidth-btnW-8,Math.round(tableRect.right+gap))+"px";
  rightBtn.style.right="auto";
}
window.addEventListener("scroll",updateTableNavVisibility,{passive:true});
window.addEventListener("resize",updateTableNavVisibility);
window.addEventListener("resize",refreshScrollIndicators);
// フォント読み込みや遅延レイアウトでズレるのを防ぐための保険の再計算
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(updateNavArrowPosition).catch(()=>{})}
[100,400,1000].forEach(ms=>setTimeout(updateNavArrowPosition,ms));

/* ---------- ASIN一括コピー ---------- */
function toggleSelectAllAsins(panel,checked){document.querySelectorAll(`.asin-check[data-panel="${panel}"]`).forEach(cb=>{cb.checked=checked})}
function resetSelectAll(panel){const panelEl=document.getElementById(panel==="relation"?"relationPanel":"overlayPanel");if(panelEl){const box=panelEl.querySelector(".select-all-check");if(box)box.checked=false}}
function getPanelAsins(panel,onlyChecked){const boxes=Array.from(document.querySelectorAll(`#${panel==="relation"?"relationTableView":"overlayTableView"} .asin-check`));const seen=new Set();const result=[];boxes.forEach(cb=>{if(onlyChecked&&!cb.checked)return;const v=cb.value;if(v&&!seen.has(v)){seen.add(v);result.push(v)}});return result}
function copyAsins(panel,onlyChecked){const asins=getPanelAsins(panel,onlyChecked);if(!asins.length){showCopyToast(onlyChecked?"チェックされたASINがありません":"コピーするASINがありません");return}const text=asins.join("\n");copyTextToClipboard(text).then(()=>{showCopyToast(`ASINを${asins.length}件コピーしました`)}).catch(()=>{showCopyToast("コピーに失敗しました")})}
function copyTextToClipboard(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);return new Promise((resolve,reject)=>{try{const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand("copy");document.body.removeChild(ta);ok?resolve():reject()}catch(e){reject(e)}})}
let copyToastTimer=null;
function showCopyToast(message){const toast=document.getElementById("copyToast");if(!toast)return;toast.textContent=message;toast.classList.add("visible");clearTimeout(copyToastTimer);copyToastTimer=setTimeout(()=>{toast.classList.remove("visible")},2200)}
document.addEventListener("change",e=>{if(e.target&&e.target.classList&&e.target.classList.contains("asin-check")){const panel=e.target.dataset.panel,asin=e.target.dataset.asin,checked=e.target.checked;document.querySelectorAll(`.asin-check[data-panel="${panel}"]`).forEach(cb=>{if(cb.dataset.asin===asin)cb.checked=checked})}});

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

/* ---------- 「?」ヘルプツールチップ (TWAPグラフの説明など) ---------- */
function initHelpTips(){
  const tooltip=document.getElementById("globalTooltip");
  if(!tooltip)return;
  function show(el){
    const text=el.getAttribute("data-tip");
    if(!text)return;
    tooltip.textContent=text;
    tooltip.classList.add("visible");
    const rect=el.getBoundingClientRect();
    requestAnimationFrame(()=>{
      const margin=8;
      const tw=tooltip.offsetWidth||230;
      const th=tooltip.offsetHeight||40;
      let left=rect.left+rect.width/2-tw/2;
      left=Math.max(margin,Math.min(left,window.innerWidth-tw-margin));
      let top=rect.top-th-10;
      if(top<margin)top=rect.bottom+10; // 上に置く余白が無ければ下側に表示
      tooltip.style.left=Math.round(left)+"px";
      tooltip.style.top=Math.round(top)+"px";
      const arrowLeft=Math.round(rect.left+rect.width/2-left);
      tooltip.style.setProperty("--tip-arrow-left",arrowLeft+"px");
    });
  }
  function hide(){tooltip.classList.remove("visible")}
  document.addEventListener("mouseover",e=>{const el=e.target.closest&&e.target.closest(".help-tip");if(el)show(el)});
  document.addEventListener("mouseout",e=>{const el=e.target.closest&&e.target.closest(".help-tip");if(el)hide()});
  document.addEventListener("focusin",e=>{const el=e.target.closest&&e.target.closest(".help-tip");if(el)show(el)});
  document.addEventListener("focusout",e=>{const el=e.target.closest&&e.target.closest(".help-tip");if(el)hide()});
  window.addEventListener("scroll",hide,{passive:true});
  window.addEventListener("resize",hide);
}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",initHelpTips)}else{initHelpTips()}

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

/* ---------- サイドバー：右クリックでページの説明を表示 ---------- */
const SIDEBAR_PAGE_INFO = {
  "top.html":{title:"TOPページ",desc:"お知らせ・通知・ランキングなど、会員ページの入り口です。"},
  "profinder.html":{title:"PROFiNDER",desc:"セラーID・ASINのリサーチや、カート・仕入れ管理を行うツールです。"},
  "inventory.html":{title:"在庫管理",desc:"仕入れリストと棚卸を管理します。"},
  "cashflow.html":{title:"キャッシュフロー管理",desc:"資金繰りの状況を確認します。"},
  "resources.html":{title:"その他SLC関連",desc:"マニュアルや各種申請フォームをまとめています。"},
  "settings.html":{title:"設定",desc:"表示設定や通知設定を変更できます。"},
  "las":{title:"LAS",desc:"SLC/LASの管理画面を別タブで開きます。"}
};
function showContextInfo(evt,title,desc){
  const popup=document.getElementById("sidebarContextPopup");
  if(!popup)return;
  evt.preventDefault();
  document.getElementById("sidebarContextTitle").textContent=title;
  document.getElementById("sidebarContextDesc").textContent=desc;
  const margin=12;
  const zoom=parseFloat(getComputedStyle(document.body).zoom)||1;
  let x=(evt.clientX+10)/zoom, y=(evt.clientY+10)/zoom;
  const maxX=(window.innerWidth-260-margin)/zoom;
  const maxY=(window.innerHeight-90-margin)/zoom;
  if(x>maxX)x=Math.max(margin,maxX);
  if(y>maxY)y=(evt.clientY-10-90)/zoom;
  popup.style.left=x+"px";
  popup.style.top=y+"px";
  popup.classList.remove("hidden");
}
function showSidebarPageInfo(evt,key){
  const info=SIDEBAR_PAGE_INFO[key];
  if(!info)return;
  showContextInfo(evt,info.title,info.desc);
}
function hideSidebarPageInfo(){
  const popup=document.getElementById("sidebarContextPopup");
  if(popup)popup.classList.add("hidden");
}
document.addEventListener("click",hideSidebarPageInfo);
document.addEventListener("scroll",hideSidebarPageInfo,true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")hideSidebarPageInfo()});

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
