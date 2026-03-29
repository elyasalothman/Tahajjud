// رفيق المسلم – v0.1 (كلاسيكي + تحديث تلقائي)
// Build: 20260329-074252

const API_BASE='https://api.aladhan.com/v1';
const KAABA={lat:21.4225,lon:39.8262};
const BDC_REVERSE='https://api-bdc.net/data/reverse-geocode-client';

const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const LS=(k,v)=> (v===undefined?localStorage.getItem(k):localStorage.setItem(k,v));
let CFG=null;
let loaded = { adhkar:false, resources:false, learning:false, tools:false };

function dayKey(){return new Date().toDateString();}
function toRad(x){return x*Math.PI/180;}
function toDeg(x){return x*180/Math.PI;}
function normalize360(x){x=x%360; if(x<0)x+=360; return x;}

function formatTime12h(d){
  try{return new Intl.DateTimeFormat('ar',{hour:'numeric',minute:'2-digit',hour12:true}).format(d);}
  catch(e){let h=d.getHours();const m=String(d.getMinutes()).padStart(2,'0');const suf=h>=12?'م':'ص';h=h%12||12;return `${h}:${m} ${suf}`;}
}

function setText(id,t){const el=document.getElementById(id); if(el) el.textContent=t;}
function isoToDate(iso){return new Date(iso);}
function dateToApi(d){const dd=String(d.getDate()).padStart(2,'0');const mm=String(d.getMonth()+1).padStart(2,'0');return `${dd}-${mm}-${d.getFullYear()}`;}

async function fetchTimingsByCoords(date,lat,lon){
  const ds=dateToApi(date);
  const url=`${API_BASE}/timings/${ds}?latitude=${lat}&longitude=${lon}&method=${CFG.calculation.method}&school=${CFG.calculation.school}&iso8601=true`;
  const r=await fetch(url);
  const j=await r.json();
  if(j.code!==200) throw new Error('API');
  return j.data;
}
async function fetchTimingsByCity(date,city,country){
  const ds=dateToApi(date);
  const url=`${API_BASE}/timingsByCity/${ds}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${CFG.calculation.method}&school=${CFG.calculation.school}&iso8601=true`;
  const r=await fetch(url);
  const j=await r.json();
  if(j.code!==200) throw new Error('API');
  return j.data;
}

function computeDuha(sunriseISO,dhuhrISO){
  const start=new Date(isoToDate(sunriseISO).getTime()+CFG.duha.startOffsetAfterSunriseMin*60000);
  const end=new Date(isoToDate(dhuhrISO).getTime()-CFG.duha.endOffsetBeforeDhuhrMin*60000);
  return {start,end};
}
function computeLastThird(maghribISO,fajrNextISO){
  const magh=isoToDate(maghribISO); const fajr=isoToDate(fajrNextISO);
  let night=fajr-magh; if(night<=0) night+=24*3600*1000;
  const third=night/3;
  return {start:new Date(fajr.getTime()-third), end:fajr};
}
function initialBearing(lat1,lon1,lat2,lon2){
  const φ1=toRad(lat1), φ2=toRad(lat2);
  const λ1=toRad(lon1), λ2=toRad(lon2);
  const y=Math.sin(λ2-λ1)*Math.cos(φ2);
  const x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  return normalize360(toDeg(Math.atan2(y,x)));
}
function translatePrayer(k){return ({Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'})[k]||k;}

function renderHijri(){
  try{const f=new Intl.DateTimeFormat('ar-SA-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}); setText('hijri',f.format(new Date()));}
  catch(e){setText('hijri','—');}
}

function setTheme(t){document.documentElement.setAttribute('data-theme',t); LS('theme',t);}
function initTheme(){
  const saved = LS('theme') || 'dark';
  setTheme(saved);
  qs('#toggleTheme').addEventListener('click',()=>setTheme((document.documentElement.getAttribute('data-theme')==='dark')?'light':'dark'));
}

function setScheme(s){document.documentElement.setAttribute('data-scheme', s); LS('scheme', s);}
function initScheme(){
  const saved = LS('scheme') || 'brown';
  setScheme(saved);
  const sel = qs('#schemeSelect');
  if(sel){ sel.value=saved; sel.addEventListener('change', ()=> setScheme(sel.value)); }
}

function showSection(id){
  qsa('.nav button').forEach(b=>b.classList.toggle('active', b.dataset.target===id));
  qsa('.section').forEach(s=>s.classList.toggle('active', s.id===id));
}
function initNav(){
  qsa('.nav button').forEach(btn=>btn.addEventListener('click', async ()=>{
    const id = btn.dataset.target;
    showSection(id);
    if(id==='adhkar' && !loaded.adhkar){ loaded.adhkar=true; await loadAdhkar(); }
    if(id==='resources' && !loaded.resources){ loaded.resources=true; await loadResources(); }
    if(id==='learning' && !loaded.learning){ loaded.learning=true; await loadLearning(); }
    if(id==='tools' && !loaded.tools){ loaded.tools=true; setupTools(); }
    window.scrollTo({top:0, behavior:'smooth'});
  }));
}

function renderFooterVersion(){ setText('footerVersion', CFG.version); }

function initCityList(){
  const cities=[
    {label:'الرياض',city:'Riyadh',country:'SA'},{label:'مكة المكرمة',city:'Makkah',country:'SA'},{label:'المدينة المنورة',city:'Al Madinah al Munawwarah',country:'SA'},
    {label:'جدة',city:'Jeddah',country:'SA'},{label:'الدمام',city:'Dammam',country:'SA'},{label:'الطائف',city:'Taif',country:'SA'},{label:'أبها',city:'Abha',country:'SA'},{label:'تبوك',city:'Tabuk',country:'SA'}
  ];
  const sel=qs('#citySelect');
  cities.forEach(c=>{const o=document.createElement('option'); o.value=JSON.stringify({city:c.city,country:c.country,label:c.label}); o.textContent=c.label; sel.appendChild(o);});
  const saved=LS('cityFallback'); if(saved) sel.value=saved;
  sel.addEventListener('change',()=>{LS('cityFallback',sel.value); updateCityKPIFromSelect();});
  updateCityKPIFromSelect();
}
function getCityFallback(){const v=LS('cityFallback'); if(v){try{return JSON.parse(v);}catch(e){}} return {...CFG.defaultCity, label:'الرياض'};}
function updateCityKPI(text){ setText('cityDisplay', text || '—'); }
function updateCityKPIFromSelect(){
  const sel=qs('#citySelect');
  if(sel && sel.value){
    try{const obj=JSON.parse(sel.value); updateCityKPI(obj.label || obj.city);}catch(e){}
  } else {
    const c=getCityFallback();
    updateCityKPI(c.label || c.city || '—');
  }
}

function setLocationMode(active){
  const wrap = qs('#cityControls');
  const chip = qs('#locChip');
  const locBtn = qs('#useLocation');
  if(active){
    if(wrap) wrap.style.display='none';
    if(locBtn) locBtn.style.display='none';
    if(chip){ chip.style.display='inline-flex'; chip.textContent='الموقع مفعل ✓'; }
  } else {
    if(wrap) wrap.style.display='flex';
    if(locBtn) locBtn.style.display='inline-flex';
    if(chip) chip.style.display='none';
  }
}

async function reverseGeocodeCity(lat, lon){
  const key = `rg:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = LS(key);
  if(cached){ try{ return JSON.parse(cached);}catch(e){} }
  const url = `${BDC_REVERSE}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=ar`;
  const r = await fetch(url);
  const j = await r.json();
  const out = { city: j.city || j.locality || j.principalSubdivision || null };
  LS(key, JSON.stringify(out));
  return out;
}

let nextTimer=null;
function renderNextPrayer(T,fajrTomorrowISO){
  const order=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  const now=new Date(); let name=null,time=null;
  for(const k of order){const d=isoToDate(T[k]); if(d>now){name=k; time=d; break;}}
  if(!name){name='Fajr'; time=isoToDate(fajrTomorrowISO);}
  setText('nextPrayerName',translatePrayer(name));
  setText('nextPrayerTime',formatTime12h(time));
  if(nextTimer) clearInterval(nextTimer);
  nextTimer=setInterval(()=>{
    const diff=time-new Date();
    if(diff<=0){setText('nextCountdown','حان الوقت'); clearInterval(nextTimer); return;}
    const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
    setText('nextCountdown',`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  },1000);
}

async function loadPrayerTimes(forceCity=false){
  setText('ptStatus',''); setText('ptMeta','');
  const today=new Date(); const tomorrow=new Date(Date.now()+24*3600*1000);
  const c=getCityFallback();
  try{
    let td, td2;
    if(!forceCity && 'geolocation' in navigator){
      setLocationMode(true);
      updateCityKPI('جاري تحديد المدينة…');
      const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:12000,maximumAge:600000}));
      const lat=pos.coords.latitude, lon=pos.coords.longitude;
      setText('ptMeta',`دقة الموقع: ±${Math.round(pos.coords.accuracy||0)}م`);
      const rgPromise = reverseGeocodeCity(lat, lon).catch(()=>null);
      td = await fetchTimingsByCoords(today,lat,lon);
      td2= await fetchTimingsByCoords(tomorrow,lat,lon);
      const rg = await rgPromise;
      updateCityKPI(rg && rg.city ? rg.city : 'موقعي');
    } else {
      setLocationMode(false);
      updateCityKPI(c.label || c.city);
      td=await fetchTimingsByCity(today,c.city,c.country);
      td2=await fetchTimingsByCity(tomorrow,c.city,c.country);
    }
    const T=td.timings, TT=td2.timings;
    ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>setText('t_'+k.toLowerCase(), formatTime12h(isoToDate(T[k]))));
    const duha=computeDuha(T.Sunrise,T.Dhuhr); setText('t_duha',`${formatTime12h(duha.start)} – ${formatTime12h(duha.end)}`);
    const last=computeLastThird(T.Maghrib,TT.Fajr); setText('t_lastthird',`${formatTime12h(last.start)} – ${formatTime12h(last.end)}`);
    renderNextPrayer(T,TT.Fajr);
  }catch(e){
    console.warn(e);
    setLocationMode(false);
    setText('ptStatus','تعذّر تحديد الموقع/جلب المواقيت. جرّب اختيار مدينة.');
  }
}

function showUpdateBar(reg){
  const bar=qs('#updateBar');
  if(!bar) return;
  bar.style.display='flex';
  qs('#updateNow').onclick=()=>{ if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'}); };
  qs('#updateLater').onclick=()=>{ bar.style.display='none'; };
}

async function registerSW(){
  if(!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
  try{ await reg.update(); }catch(e){}
  navigator.serviceWorker.addEventListener('controllerchange', ()=> window.location.reload());
  if(reg.waiting) showUpdateBar(reg);
  reg.addEventListener('updatefound', ()=>{
    const sw = reg.installing;
    if(!sw) return;
    sw.addEventListener('statechange', ()=>{
      if(sw.state==='installed' && navigator.serviceWorker.controller){
        showUpdateBar(reg);
      }
    });
  });
}

async function init(){
  CFG=await (await fetch('./assets/js/config.json')).json();
  initTheme();
  initScheme();
  initNav();
  initCityList();
  renderHijri();
  renderFooterVersion();
  qs('#useLocation').addEventListener('click', ()=> loadPrayerTimes(false));
  qs('#useCity').addEventListener('click', ()=> loadPrayerTimes(true));
  await loadPrayerTimes(false);
  await registerSW();
}

window.addEventListener('load', init);
