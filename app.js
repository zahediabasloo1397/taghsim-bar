
let DB = null;
const KEY="transport_load_system_v1";
const state={factory:"فولاد سیرجان ایرانیان",origin:"بناب",destination:"تهران",fareCity:"تهران",fareFactory:"فولاد سیرجان ایرانیان",
historyFactory:"فولاد سیرجان ایرانیان",historyOrigin:"بناب",historyDestination:"تهران",historyCompany:""};

function loadDB(){
  const saved=localStorage.getItem(KEY);
  if(saved){try{DB=JSON.parse(saved)}catch(e){}}
  if(!DB) DB={factories:[],companies:[],cities:[],fares:[],history:[]};
}
function saveDB(){localStorage.setItem(KEY,JSON.stringify(DB));}
function toast(s){const t=document.getElementById("toast");t.textContent=s;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function fmt(n){return Number(n||0).toLocaleString("fa-IR",{maximumFractionDigits:2})}
function norm(s){return String(s||"").trim().toLowerCase()}

function combo(elId,items,getLabel,onPick,initial=""){
  const el=document.getElementById(elId); el.innerHTML="";
  const input=document.createElement("input"); input.autocomplete="off"; input.placeholder="جستجو و انتخاب...";
  const arrow=document.createElement("span"); arrow.className="arrow"; arrow.textContent="⌄";
  const menu=document.createElement("div"); menu.className="combo-menu"; menu.style.display="none";
  el.append(input,arrow,menu);
  let value=initial;
  input.value=value;
  function render(q=""){
    menu.innerHTML="";
    const qq=norm(q);
    const list=items.filter(x=>!qq || norm(getLabel(x)).includes(qq)).slice(0,250);
    if(!list.length){menu.innerHTML='<div class="combo-empty">موردی پیدا نشد</div>';return}
    list.forEach(x=>{const d=document.createElement("div");d.className="combo-item";d.textContent=getLabel(x);
      d.onclick=()=>{value=getLabel(x);input.value=value;menu.style.display="none";onPick(value,x)};menu.appendChild(d)})
  }
  input.onfocus=()=>{render(input.value);menu.style.display="block"};
  input.oninput=()=>{render(input.value);menu.style.display="block"};
  document.addEventListener("click",e=>{if(!el.contains(e.target))menu.style.display="none"});
  return {get:()=>value,set:v=>{value=v;input.value=v}};
}

function cityNames(){return DB.cities.map(c=>c.name)}
function setupCombos(){
  combo("factoryCombo",DB.factories,x=>x,v=>{state.factory=v});
  combo("originCombo",DB.cities,x=>x.name,v=>{state.origin=v});
  combo("destinationCombo",DB.cities,x=>x.name,v=>{state.destination=v; updateFareInfo()});
  combo("fareCityCombo",DB.cities,x=>x.name,v=>{state.fareCity=v});
  combo("fareFactoryCombo",DB.factories,x=>x,v=>{state.fareFactory=v});
  combo("historyFactoryCombo",DB.factories,x=>x,v=>{state.historyFactory=v});
  combo("historyOriginCombo",DB.cities,x=>x.name,v=>{state.historyOrigin=v});
  combo("historyDestinationCombo",DB.cities,x=>x.name,v=>{state.historyDestination=v});
  combo("historyCompanyCombo",DB.companies.filter(c=>c.active),x=>x.name,v=>{state.historyCompany=v});
}

function fareFor(city,factory){const f=DB.fares.find(x=>x.city===city&&x.factory===factory);return f?Number(f.fare):0}
function previousTonnage(company,factory){return DB.history.filter(h=>h.factory===factory&&h.company===company).reduce((a,h)=>a+Number(h.tonnage||0),0)}
function calculate(){
  let ton=Number(document.getElementById("tonnage").value||0);
  if(ton<25||ton>100000||ton%25!==0){toast("تناژ باید بین ۲۵ تا ۱۰۰٬۰۰۰ و مضرب ۲۵ باشد.");return}
  const active=DB.companies.filter(c=>c.active);
  const fares=active.map(c=>fareFor(state.destination,state.factory));
  const maxFare=Math.max(...fares,0);
  const totalPrev=active.reduce((a,c)=>a+previousTonnage(c.name,state.factory),0);
  const rows=active.map((c,i)=>{
    const target=Number(c.shares[state.factory]||0);
    const prev=previousTonnage(c.name,state.factory);
    const actual=totalPrev?prev/totalPrev*100:0;
    const deficit=Math.max(0,target-actual);
    const fare=fares[i];
    const fareScore=maxFare?fare/maxFare:0;
    let score;
    const method=document.getElementById("method").value;
    if(method==="fare") score=fareScore;
    else if(method==="deficit") score=deficit;
    else score=.6*fareScore+.4*deficit;
    return {name:c.name,target,prev,fare,fareScore,deficit,score};
  });
  const sum=rows.reduce((a,r)=>a+r.score,0);
  rows.forEach(r=>r.suggest=sum?r.score/sum*ton:0);
  rows.sort((a,b)=>b.score-a.score);
  const tb=document.querySelector("#resultTable tbody");tb.innerHTML="";
  rows.forEach((r,i)=>{const tr=document.createElement("tr");tr.dataset.text=norm(r.name);
    tr.innerHTML=`<td>${fmt(i+1)}</td><td>${r.name}</td><td>${fmt(r.target)}</td><td>${fmt(r.prev)}</td><td>${fmt(r.fare)}</td><td>${fmt(r.fareScore)}</td><td>${fmt(r.deficit)}</td><td>${fmt(r.score)}</td><td><b>${fmt(Math.round(r.suggest/25)*25)}</b></td>`;tb.appendChild(tr)});
  document.getElementById("fareInfo").textContent=state.destination+" / "+state.factory+" — کرایه پایه مسیر: "+fmt(fareFor(state.destination,state.factory))+" تومان/تن";
}
function updateFareInfo(){document.getElementById("fareInfo").textContent="کرایه پایه: "+fmt(fareFor(state.destination,state.factory))+" تومان/تن"}

function renderFares(){
  const q=norm(document.getElementById("fareSearch").value);
  const tb=document.querySelector("#fareTable tbody");tb.innerHTML="";
  DB.fares.filter(f=>!q||norm(f.city).includes(q)||norm(f.factory).includes(q)).forEach((f,i)=>{
    const tr=document.createElement("tr");tr.innerHTML=`<td>${f.city}</td><td>${f.factory}</td><td>${fmt(f.fare)}</td><td><button class="danger" onclick="deleteFare(${DB.fares.indexOf(f)})">حذف</button></td>`;tb.appendChild(tr)
  });
}
window.deleteFare=i=>{DB.fares.splice(i,1);saveDB();renderFares();toast("کرایه حذف شد")};

function renderCompanies(){
  const tb=document.querySelector("#companyTable tbody");tb.innerHTML="";
  DB.companies.forEach((c,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td>${c.name}</td><td><input type="checkbox" data-i="${i}" class="activeBox" ${c.active?"checked":""}></td>
    <td><input class="small-input share" data-i="${i}" data-f="${DB.factories[0]}" type="number" min="0" max="100" step=".01" value="${c.shares[DB.factories[0]]||0}"></td>
    <td><input class="small-input share" data-i="${i}" data-f="${DB.factories[1]}" type="number" min="0" max="100" step=".01" value="${c.shares[DB.factories[1]]||0}"></td>
    <td><input class="small-input share" data-i="${i}" data-f="${DB.factories[2]}" type="number" min="0" max="100" step=".01" value="${c.shares[DB.factories[2]]||0}"></td>`;
    tb.appendChild(tr)
  });
}
function saveCompanies(){
  document.querySelectorAll(".activeBox").forEach(x=>DB.companies[Number(x.dataset.i)].active=x.checked);
  document.querySelectorAll(".share").forEach(x=>DB.companies[Number(x.dataset.i)].shares[x.dataset.f]=Number(x.value||0));
  saveDB();setupCombos();toast("شرکت‌ها و سهم‌ها ذخیره شد");
}
function renderHistory(){
  const q=norm(document.getElementById("historySearch").value);const tb=document.querySelector("#historyTable tbody");tb.innerHTML="";
  DB.history.filter(h=>!q||Object.values(h).some(v=>norm(v).includes(q))).forEach((h,i)=>{
    const tr=document.createElement("tr");tr.innerHTML=`<td>${h.date}</td><td>${h.factory}</td><td>${h.origin}</td><td>${h.destination}</td><td>${h.company}</td><td>${fmt(h.tonnage)}</td><td><button class="danger" onclick="deleteHistory(${i})">حذف</button></td>`;tb.appendChild(tr)
  })
}
window.deleteHistory=i=>{DB.history.splice(i,1);saveDB();renderHistory();toast("سابقه حذف شد")};

function exportDB(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="پشتیبان_سیستم_تقسیم_بار.json";a.click();URL.revokeObjectURL(a.href)
}
document.getElementById("importFile").onchange=e=>{
  const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{DB=JSON.parse(r.result);saveDB();location.reload()}catch(_){toast("فایل پشتیبان معتبر نیست")}};r.readAsText(file)
};

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.tab).classList.add("active");
});
document.getElementById("calculateBtn").onclick=calculate;
document.getElementById("fareSearch").oninput=renderFares;
document.getElementById("resultSearch").oninput=e=>{const q=norm(e.target.value);document.querySelectorAll("#resultTable tbody tr").forEach(r=>r.style.display=!q||r.dataset.text.includes(q)?"":"none")};
document.getElementById("historySearch").oninput=renderHistory;
document.getElementById("saveFare").onclick=()=>{
  const city=document.querySelector("#fareCityCombo input").value.trim(),factory=document.querySelector("#fareFactoryCombo input").value.trim(),fare=Number(document.getElementById("fareValue").value||0);
  if(!city||!factory||fare<=0){toast("شهر، کارخانه و کرایه را کامل وارد کن.");return}
  const old=DB.fares.find(f=>f.city===city&&f.factory===factory);if(old)old.fare=fare;else DB.fares.push({city,factory,fare});
  saveDB();renderFares();updateFareInfo();toast("کرایه ذخیره شد")
};
document.getElementById("saveCompanies").onclick=saveCompanies;
document.getElementById("saveHistory").onclick=()=>{
  const date=document.getElementById("hDate").value||new Date().toISOString().slice(0,10),ton=Number(document.getElementById("hTonnage").value||0);
  const company=document.querySelector("#historyCompanyCombo input").value.trim();
  if(!company||ton<25||ton>100000||ton%25!==0){toast("شرکت و تناژ معتبر را وارد کن.");return}
  DB.history.push({date,factory:state.historyFactory,origin:state.historyOrigin,destination:state.historyDestination,company,tonnage:ton});
  saveDB();renderHistory();toast("بار ثبت شد")
};
document.getElementById("exportBtn").onclick=exportDB;

fetch("data.json").then(r=>r.json()).then(d=>{
  const saved=localStorage.getItem(KEY);
  if(saved){loadDB()}else{DB={...d,history:[]};saveDB()}
  setupCombos();renderCompanies();renderFares();renderHistory();calculate();
}).catch(e=>{loadDB();setupCombos();renderCompanies();renderFares();renderHistory()});
