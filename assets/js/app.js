// Rafiq Muslim v0.6.3 - Full Fixed & Official
const API_BASE='https://api.aladhan.com/v1';
const KAABA={lat:21.4225,lon:39.8262};
const BDC_REVERSE='https://api-bdc.net/data/reverse-geocode-client';
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const LS = (k,v) => { try { if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); } catch(e) { return null; } };

let CFG=null, nextTimer=null; let loaded={adhkar:false,resources:false,learning:false};
let rawAdhkarData=null; let showTashkeel=LS('tashkeel')!=='false'; 
let currentFontSize = parseFloat(LS('fontSize')) || 1.1;

const TASBEEH_PHRASES=[{"name": "سُبْحَانَ اللَّهِ", "target": 33}, {"name": "الْحَمْدُ لِلَّهِ", "target": 33}, {"name": "اللَّهُ أَكْبَرُ", "target": 34}, {"name": "لَا إِلَهَ إِلَّا اللَّهُ", "target": 100}, {"name": "أَسْتَغْفِرُ اللَّهَ", "target": 100}];

function setText(id,t){const e=document.getElementById(id); if(e) e.textContent=t;}
function isoToDate(i){return new Date(i)}
function dateToApi(d){return String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear()}
function toRad(x){return x*Math.PI/180} function toDeg(x){return x*180/Math.PI} function normalize360(x){x%=360; if(x<0)x+=360; return x}
function formatTime12h(d){try{return new Intl.DateTimeFormat('ar',{hour:'numeric',minute:'2-digit',hour12:true}).format(d)}catch(e){return "—"}}

async function fetchJSON(url, defaultData) {
    try { const res = await fetch(url); return res.ok ? await res.json() : defaultData; } 
    catch(e) { return defaultData; }
}

function renderHijri(){
  try{
    const d = new Date(); const adj = parseInt(LS('hijriAdj')) || 0; d.setDate(d.getDate() + adj);
    const f=new Intl.DateTimeFormat('ar-SA-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}); setText('hijri',f.format(d));
  }catch(e){setText('hijri','—')}
}

function translatePrayer(k){return ({Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'})[k]||k;}
function computeDuha(s,d){return {start:new Date(isoToDate(s).getTime()+CFG.duha.startOffsetAfterSunriseMin*60000), end:new Date(isoToDate(d).getTime()-CFG.duha.endOffsetBeforeDhuhrMin*60000)}}
function computeLastThird(m,f){const magh=isoToDate(m), fajr=isoToDate(f); let night=fajr-magh; if(night<=0) night+=86400000; const third=night/3; return {start:new Date(fajr.getTime()-third), end:fajr}}
function bearing(lat1,lon1,lat2,lon2){const φ1=toRad(lat1),φ2=toRad(lat2),λ1=toRad(lon1),λ2=toRad(lon2); const y=Math.sin(λ2-λ1)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1); return normalize360(toDeg(Math.atan2(y,x)));}

async function fetchTimingsByCoords(date,lat,lon, methodOverride){const m = methodOverride || CFG.calculation.method; const ds=dateToApi(date); const u=`${API_BASE}/timings/${ds}?latitude=${lat}&longitude=${lon}&method=${m}&school=${CFG.calculation.school}&iso8601=true`; const r=await fetch(u); const j=await r.json(); return j.data;}
async function fetchTimingsByCity(date,city,country, methodOverride){const m = methodOverride || CFG.calculation.method; const ds=dateToApi(date); const u=`${API_BASE}/timingsByCity/${ds}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${m}&school=${CFG.calculation.school}&iso8601=true`; const r=await fetch(u); const j=await r.json(); return j.data;}

function initScheme() {
  const s = LS('scheme') || 'brown'; document.documentElement.setAttribute('data-scheme', s);
  qsa('.color-dot').forEach(btn => btn.addEventListener('click', (e) => { const v = e.target.getAttribute('data-val'); document.documentElement.setAttribute('data-scheme', v); LS('scheme', v); }));
}

function applyFontSize() { document.body.style.fontSize = currentFontSize + 'rem'; LS('fontSize', currentFontSize); }

function initUI() {
  qs('#btnTextInc')?.addEventListener('click', () => { currentFontSize += 0.05; applyFontSize(); });
  qs('#btnTextDec')?.addEventListener('click', () => { currentFontSize = Math.max(0.8, currentFontSize - 0.05); applyFontSize(); });
  qs('#toggleTashkeel')?.addEventListener('click', () => { 
    showTashkeel = !showTashkeel; LS('tashkeel', showTashkeel);
    if(loaded.adhkar && rawAdhkarData) { const activeBtn = qs('#adhkarPills button.active'); if(activeBtn) renderDhikrList(qs('#adhkarContainer'), rawAdhkarData[activeBtn.dataset.key]||[], activeBtn.dataset.key); }
  });
  qs('#btnNotify')?.addEventListener('click', () => { Notification.requestPermission().then(p => { if(p==='granted') alert('تم تفعيل التنبيهات بنجاح ✓'); }); });
  let adj = parseInt(LS('hijriAdj')) || 0; const sel = qs('#hijriAdjSelect');
  if(sel){ sel.value = String(adj); sel.addEventListener('change', (e) => { LS('hijriAdj', parseInt(e.target.value)); renderHijri(); }); }
  applyFontSize();
}

function showSection(id){qsa('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.target===id)); qsa('.section').forEach(s=>s.classList.toggle('active',s.id===id));}
function initNav(){
  qsa('.bottom-nav button').forEach(btn=>btn.addEventListener('click',async()=>{
    const id=btn.dataset.target; showSection(id); 
    if(id==='adhkar'&&!loaded.adhkar){loaded.adhkar=true; await loadAdhkar();} 
    if(id==='learning'&&!loaded.learning){loaded.learning=true; await Promise.all([loadLearning(), loadResources(), loadDailyBenefit()]);} 
    window.scrollTo({top:0,behavior:'smooth'});
  }));
}

function setupCompass(){
  const needle=qs('#needle'), accBox=qs('#compassAccuracyBox'); if(!needle || !accBox) return; 
  let ema=null; function delta(a,b){return (b-a+540)%360-180} 
  function updateAccUI(acc) {
    accBox.className = 'accuracy-box';
    if(acc <= 15) { accBox.textContent = 'دقة عالية ✓'; accBox.classList.add('acc-high'); }
    else if(acc <= 45) { accBox.textContent = 'دقة متوسطة'; accBox.classList.add('acc-med'); }
    else { accBox.textContent = 'دقة سيئة! يرجى تحريك الجوال بشكل رقم 8 🔄'; accBox.classList.add('acc-low'); }
  }
  function onOri(ev){
    let heading=null; if(typeof ev.webkitCompassHeading==='number' && ev.webkitCompassHeading>=0){ heading=ev.webkitCompassHeading; if(typeof ev.webkitCompassAccuracy==='number') updateAccUI(ev.webkitCompassAccuracy); } 
    else if(typeof ev.alpha==='number'){ heading=360-ev.alpha; accBox.textContent='دقة تقريبية (تحتاج معايرة)'; } 
    if(heading==null) return; const q=parseFloat(LS('qiblaBearing')||'0')||0; if(ema==null) ema=heading; 
    ema=normalize360(ema+delta(ema,heading)*0.2); needle.style.transform=`translate(-50%,-100%) rotate(${normalize360(q-ema)}deg)`;
  } 
  qs('#enableCompass')?.addEventListener('click',async()=>{
    try{ if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission==='function'){ const p=await DeviceOrientationEvent.requestPermission(); if(p!=='granted') return; } 
    window.addEventListener('deviceorientation',onOri,true); setText('compassStatus','تم تفعيل الحساسات'); }catch(e){setText('compassStatus','تعذّر الوصول للحساسات');}
  });
}

function haptic(ms=10){try{if(navigator.vibrate) navigator.vibrate(ms);}catch(e){}}
function setupTasbeeh(){
  const select=qs('#tasbeehPhraseSelect'), current=qs('#currentTasbeeh'), countEl=qs('#tasbeehCount'), targetEl=qs('#tasbeehTarget'), btn=qs('#tasbeehBtn'), resetBtn=qs('#tasbeehReset'), nextBtn=qs('#tasbeehNext'); 
  if(!select||!current||!countEl||!targetEl||!btn||!resetBtn||!nextBtn) return;
  select.innerHTML=''; TASBEEH_PHRASES.forEach((p,idx)=>{const o=document.createElement('option'); o.value=String(idx); o.textContent=`${p.name} — ${p.target}`; select.appendChild(o);}); 
  let phraseIndex=parseInt(LS('tasbeehPhraseIndex')||'0',10); let count=parseInt(LS('tasbeehCount')||'0',10);
  function render(){const p=TASBEEH_PHRASES[phraseIndex]; select.value=String(phraseIndex); current.textContent=p.name; countEl.textContent=String(count); targetEl.textContent=`الهدف: ${p.target}`;}
  function save(){LS('tasbeehPhraseIndex',String(phraseIndex)); LS('tasbeehCount',String(count));}
  select.addEventListener('change',()=>{phraseIndex=parseInt(select.value,10)||0; count=0; save(); render(); haptic(15);}); 
  btn.addEventListener('click',()=>{const p=TASBEEH_PHRASES[phraseIndex]; count+=1; save(); render(); if(count===p.target) haptic([30,40,30]); else haptic(10);}); 
  resetBtn.addEventListener('click',()=>{count=0; save(); render(); haptic(20);}); 
  nextBtn.addEventListener('click',()=>{phraseIndex=(phraseIndex+1)%TASBEEH_PHRASES.length; count=0; save(); render(); haptic([15,20]);}); 
  render();
}

function dayKey(){return new Date().toDateString()}
function updateGlobalProgress(list, keyPrefix) {
  const bar = qs('#globalAdhkarProgress'); if(!bar) return;
  const completed = list.filter((it, i) => { const k=`dhikr:${keyPrefix}:${i}:${dayKey()}`; return typeof it.repeat === 'number' ? LS(k) === '0' : true; }).length;
  bar.style.width = Math.round((completed / list.length) * 100) + '%';
}

function renderPager(container,list,keyPrefix){
  if(!list) return; updateGlobalProgress(list, keyPrefix);
  let index=parseInt(LS(`pager:${keyPrefix}:index`)||'0',10);
  const host=document.createElement('div'); host.className='pager-wrap'; host.innerHTML=`<div class="pager-index"></div><div class="pager-card"></div><div class="pager-controls"><button class="btn secondary prev">السابق</button><button class="btn next">التالي</button></div>`;
  container.appendChild(host);
  function update(){
    const it=list[index]; const k=`dhikr:${keyPrefix}:${index}:${dayKey()}`;
    let rem=LS(k); rem=rem==null?(typeof it.repeat==='number'?it.repeat:0):parseInt(rem,10);
    const displayText = showTashkeel ? it.text : (it.text||'').replace(/[\u064B-\u065F\u0640]/g, '');
    host.querySelector('.pager-index').textContent=`${index+1} / ${list.length}`;
    host.querySelector('.pager-card').innerHTML=`<p class="dhikr-text">${displayText}</p><div class="actions"><button class="btn tiny do">${rem===0?'تم':rem}</button></div>`;
    host.querySelector('.do').addEventListener('click',()=>{ if(rem>0){rem--; LS(k,String(rem)); update(); updateGlobalProgress(list, keyPrefix); haptic(10);} });
  }
  host.querySelector('.prev').addEventListener('click',()=>{if(index>0){index--; update();}});
  host.querySelector('.next').addEventListener('click',()=>{if(index<list.length-1){index++; update();}});
  update();
}

async function loadAdhkar(){
  rawAdhkarData = await fetchJSON('./data/adhkar.json', {});
  const pills=qs('#adhkarPills'); pills.innerHTML='';
  ['morning','evening','afterPrayer'].forEach(k=>{ const b=document.createElement('button'); b.textContent=k; b.addEventListener('click',()=>{ renderDhikrList(qs('#adhkarContainer'),rawAdhkarData[k],k); }); pills.appendChild(b); });
}

function renderDhikrList(c,l,k){c.innerHTML=''; renderPager(c,l,k);}

async function loadPrayerTimes(forceCity=false){
  const today=new Date(); const c = CFG.defaultCity;
  const data = await fetchTimingsByCity(today, c.city, c.country);
  const T = data.timings;
  setText('t_fajr_s', formatTime12h(isoToDate(T.Fajr)));
  setText('t_dhuhr_s', formatTime12h(isoToDate(T.Dhuhr)));
  setText('t_asr_s', formatTime12h(isoToDate(T.Asr)));
  setText('t_maghrib_s', formatTime12h(isoToDate(T.Maghrib)));
  setText('t_isha_s', formatTime12h(isoToDate(T.Isha)));
}

async function init(){
  CFG = await fetchJSON('./assets/js/config.json', { calculation: { method: 4, school: 0 }, defaultCity: { city: 'Makkah', country: 'SA' } }); 
  initScheme(); initUI(); initNav(); renderHijri(); setupCompass(); setupTasbeeh();
  await loadPrayerTimes(false);
}
window.addEventListener('load',init);
