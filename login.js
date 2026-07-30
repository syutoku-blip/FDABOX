/* =========================================================================
   login.js
   ログインページ (index.html) 専用スクリプト
   ========================================================================= */

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyfOE6dymQp-OYemADZQZ-cRWzlG89Udyaf1aUyGUUb56qXID9djzWUoirrRHO4YKRUKQ/exec";
const SESSION_KEY = "shift_session";

function toHalfWidthAlphaNum(value){return String(value||"").replace(/[Ａ-Ｚａ-ｚ０-９]/g,function(ch){return String.fromCharCode(ch.charCodeAt(0)-0xFEE0)})}
function isValidUsername(value){return /^[A-Za-z0-9Ａ-Ｚａ-ｚ０-９]+$/.test(String(value||""))}
function getMemberNoForApi(){const raw=document.getElementById("username").value.trim();return toHalfWidthAlphaNum(raw)}
function validateUsernameInput(){const input=document.getElementById("username");const value=input.value.trim();if(value && !isValidUsername(value)){setMessage("会員番号は数字とアルファベットのみ入力できます")}else{setMessage("")}}
function showLoading(text="処理中です"){document.getElementById("loadingText").innerText=text;document.getElementById("loadingOverlay").classList.add("active")}
function hideLoading(){document.getElementById("loadingOverlay").classList.remove("active")}
function setMessage(text,type="error"){const message=document.getElementById("message");message.style.color=type==="success"?"#1a9c5a":"#e0293f";message.innerText=text}
function togglePasswordVisibility(){const password=document.getElementById("password");const button=document.getElementById("togglePassword");const isHidden=password.type==="password";password.type=isHidden?"text":"password";button.classList.toggle("is-visible",isHidden);button.setAttribute("aria-label",isHidden?"パスワードを隠す":"パスワードを表示")}

async function callApi(payload){
  if(!GAS_WEB_APP_URL||GAS_WEB_APP_URL.includes("ここに"))throw new Error("Apps ScriptのURLが未設定です");
  const res=await fetch(GAS_WEB_APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  return await res.json();
}

async function registerUser(){
  const rawUsername=document.getElementById("username").value.trim();
  const username=getMemberNoForApi();
  const password=document.getElementById("password").value;
  if(!rawUsername||!password){setMessage("会員番号とパスワードを入力してください");return}
  if(!isValidUsername(rawUsername)){setMessage("会員番号は数字とアルファベットのみ入力できます");return}
  try{
    setMessage("");
    showLoading("新規登録を確認中です");
    const data=await callApi({action:"register",memberNo:username,password:password});
    if(data.success){setMessage("登録完了！ログインしてください","success")}
    else{setMessage(data.message||"登録できません")}
  }catch(e){
    setMessage(e.message||"通信エラーが発生しました");
  }finally{
    hideLoading();
  }
}

async function loginUser(){
  const rawUsername=document.getElementById("username").value.trim();
  const username=getMemberNoForApi();
  const password=document.getElementById("password").value;
  if(!rawUsername||!password){setMessage("会員番号とパスワードを入力してください");return}
  if(!isValidUsername(rawUsername)){setMessage("会員番号は数字とアルファベットのみ入力できます");return}
  try{
    setMessage("");
    showLoading("ログイン確認中です");
    const data=await callApi({action:"login",memberNo:username,password:password});
    if(!data.success){setMessage(data.message||"ユーザー名もしくはパスワードが間違っています");return}

    const relationItems=extractItems(data,["relationItems","relationResearchItems","relation","items","data"]);
    const overlayItems=extractItems(data,["overlayItems","overlayResearchItems","overlay","overlayData"]);
    const session={
      memberNo:username,
      relationItems,
      overlayItems,
      relationUpdatedDate:data?.relationUpdatedDate||data?.updatedDate||data?.updatedAt||"-",
      overlayUpdatedDate:data?.overlayUpdatedDate||data?.overlayUpdatedAt||data?.updatedDate||data?.updatedAt||"-",
      loginAt:Date.now()
    };
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
    window.location.href="top.html";
  }catch(e){
    setMessage(e.message||"通信エラーが発生しました");
  }finally{
    hideLoading();
  }
}

// data からキー候補配列を順に探して最初に見つかった配列を返す(login.js内で完結させるための軽量版)
function extractItems(data,keys){
  for(const key of keys){
    const value=data?.[key];
    if(Array.isArray(value))return value;
    if(value&&Array.isArray(value.items))return value.items;
    if(value&&Array.isArray(value.rows))return value.rows;
  }
  return [];
}

// このページは常にログイン画面として振る舞う(既存セッションがあっても自動遷移はしない)
sessionStorage.removeItem(SESSION_KEY);
