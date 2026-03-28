// رفيق المسلم – تطبيق ويب (GitHub Pages)
// Build: 20260328-191035

const API_BASE = 'https://api.aladhan.com/v1';
const KAABA = { lat: 21.4225, lon: 39.8262 };

const qs = (s, r=document)=> r.querySelector(s);
const qsa = (s, r=document)=> Array.from(r.querySelectorAll(s));

const LS = (k, v)=> (v===undefined ? localStorage.getItem(k) : localStorage.setItem(k, v));

let CFG = null;

function dayKey(){ return new Date().toDateString(); }

function toRad(x){ return x*Math.PI/180; }
function toDeg(x){ return x*180/Math.PI; }

function normalize360(x){ x = x % 360; if (x<0) x += 360; return x; }

function formatTime12h(d){
  try {
    return new Intl.DateTimeFormat('ar', { hour:'numeric', minute:'2-digit', hour12:true }).format(d);
  } catch(e) {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2,'0');
    const suf = h>=12 ? 'م' : 'ص';
    h = h%12; if(h===0) h=12;
    return `${h}:${m} ${suf}`;
  }
}

function setText(id, t){ const el = document.getElementById(id); if(el) el.textContent = t; }

function isoToDate(iso){ return new Date(iso); }

function dateToApi(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function fetchTimingsByCoords(date, lat, lon){
  const ds = dateToApi(date);
  const url = `${API_BASE}/timings/${ds}?latitude=${lat}&longitude=${lon}&method=${CFG.calculation.method}&school=${CFG.calculation.school}&iso8601=true`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.code !== 200) throw new Error('API_ERROR');
  return j.data;
}

async function fetchTimingsByCity(date, city, country){
  const ds = dateToApi(date);
  const url = `${API_BASE}/timingsByCity/${ds}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${CFG.calculation.method}&school=${CFG.calculation.school}&iso8601=true`;
  const r = await fetch(url);
  const j = await r.json();
  if (j.code !== 200) throw new Error('API_ERROR');
  return j.data;
}

function computeDuha(sunriseISO, dhuhrISO){
  const start = new Date(isoToDate(sunriseISO).getTime() + CFG.duha.startOffsetAfterSunriseMin*60000);
  const end = new Date(isoToDate(dhuhrISO).getTime() - CFG.duha.endOffsetBeforeDhuhrMin*60000);
  return { start, end };
}

function computeLastThird(maghribISO, fajrNextISO){
  const magh = isoToDate(maghribISO);
  const fajr = isoToDate(fajrNextISO);
  let night = fajr - magh;
  if (night <= 0) night += 24*3600*1000;
  const third = night / 3;
  return { start: new Date(fajr.getTime() - third), end: fajr };
}

function initialBearing(lat1, lon1, lat2, lon2){
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const λ1 = toRad(lon1), λ2 = toRad(lon2);
  const y = Math.sin(λ2-λ1)*Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  const θ = Math.atan2(y, x);
  return normalize360(toDeg(θ));
}

function translatePrayer(k){
  return ({Fajr:'الفجر',Sunrise:'الشروق',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'})[k] || k;
}

function renderHijri(){
  try {
    const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {day:'numeric', month:'long', year:'numeric'});
    setText('hijri', f.format(new Date()));
  } catch(e) {
    setText('hijri', '—');
  }
}

function renderVersion(){
  setText('version', CFG.version);
  setText('build', CFG.build);
}

function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  LS('theme', theme);
}

function initTheme(){
  const saved = LS('theme') || 'dark';
  setTheme(saved);
  qs('#toggleTheme').addEventListener('click', ()=>{
    const now = document.documentElement.getAttribute('data-theme');
    setTheme(now==='dark' ? 'light' : 'dark');
  });
}

function initNav(){
  qsa('.nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      qsa('.nav button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      qsa('.section').forEach(s=>s.classList.remove('active'));
      qs('#'+btn.dataset.target).classList.add('active');
    });
  });
}

function initCityList(){
  const cities = [
    {label:'الرياض', city:'Riyadh', country:'SA'},
    {label:'مكة المكرمة', city:'Makkah', country:'SA'},
    {label:'المدينة المنورة', city:'Al Madinah al Munawwarah', country:'SA'},
    {label:'جدة', city:'Jeddah', country:'SA'},
    {label:'الدمام', city:'Dammam', country:'SA'},
    {label:'الطائف', city:'Taif', country:'SA'},
    {label:'أبها', city:'Abha', country:'SA'},
    {label:'تبوك', city:'Tabuk', country:'SA'}
  ];
  const sel = qs('#citySelect');
  cities.forEach(c=>{
    const o = document.createElement('option');
    o.value = JSON.stringify({city:c.city, country:c.country});
    o.textContent = c.label;
    sel.appendChild(o);
  });

  const saved = LS('cityFallback');
  if(saved) sel.value = saved;

  sel.addEventListener('change', async ()=>{
    LS('cityFallback', sel.value);
    await loadPrayerTimes({forceCity:true});
  });
}

function getCityFallback(){
  const v = LS('cityFallback');
  if(v) { try { return JSON.parse(v); } catch(e){} }
  return CFG.defaultCity;
}

async function loadPrayerTimes(opts={}){
  setText('ptStatus','');
  const today = new Date();
  const tomorrow = new Date(Date.now()+24*3600*1000);
  const cityFallback = getCityFallback();

  const useCity = opts.forceCity === true;

  try {
    let tdata, tdataTomorrow;

    if(!useCity){
      if(!('geolocation' in navigator)) throw new Error('NO_GEO');
      const pos = await new Promise((res, rej)=> navigator.geolocation.getCurrentPosition(res, rej, {enableHighAccuracy:true, timeout:10000, maximumAge:600000}));
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      setText('ptMeta', `موقعك: ${lat.toFixed(4)} , ${lon.toFixed(4)}`);
      tdata = await fetchTimingsByCoords(today, lat, lon);
      tdataTomorrow = await fetchTimingsByCoords(tomorrow, lat, lon);
      await updateQiblaFromCoords(lat, lon);
    } else {
      setText('ptMeta', `مدينة مختارة: ${cityFallback.city}`);
      tdata = await fetchTimingsByCity(today, cityFallback.city, cityFallback.country);
      tdataTomorrow = await fetchTimingsByCity(tomorrow, cityFallback.city, cityFallback.country);
      // Qibla from city isn't exact without coords; we keep last known or show note
    }

    const T = tdata.timings;
    const TT = tdataTomorrow.timings;

    ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>{
      setText('t_'+k.toLowerCase(), formatTime12h(isoToDate(T[k])));
    });

    const duha = computeDuha(T.Sunrise, T.Dhuhr);
    setText('t_duha', `${formatTime12h(duha.start)} – ${formatTime12h(duha.end)}`);

    const lastThird = computeLastThird(T.Maghrib, TT.Fajr);
    setText('t_lastthird', `${formatTime12h(lastThird.start)} – ${formatTime12h(lastThird.end)}`);

    renderNextPrayer(T, TT.Fajr);

  } catch(e) {
    console.warn(e);
    setText('ptStatus', 'تعذّر تحديد الموقع. اختر مدينة من القائمة أو فعّل إذن الموقع.');
    setText('ptMeta','');
    // fallback to city automatically
    const c = getCityFallback();
    try {
      const tdata = await fetchTimingsByCity(today, c.city, c.country);
      const tdataTomorrow = await fetchTimingsByCity(tomorrow, c.city, c.country);
      const T = tdata.timings; const TT = tdataTomorrow.timings;
      ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>setText('t_'+k.toLowerCase(), formatTime12h(isoToDate(T[k]))));
      const duha = computeDuha(T.Sunrise, T.Dhuhr);
      setText('t_duha', `${formatTime12h(duha.start)} – ${formatTime12h(duha.end)}`);
      const lastThird = computeLastThird(T.Maghrib, TT.Fajr);
      setText('t_lastthird', `${formatTime12h(lastThird.start)} – ${formatTime12h(lastThird.end)}`);
      renderNextPrayer(T, TT.Fajr);
    } catch(err) {
      setText('ptStatus', 'تعذّر جلب المواقيت من الخدمة.');
    }
  }
}

let nextTimer = null;

function renderNextPrayer(T, fajrTomorrowISO){
  const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  const now = new Date();

  let nextName=null, nextTime=null;

  for(const k of order){
    const d = isoToDate(T[k]);
    if(d > now){ nextName=k; nextTime=d; break; }
  }

  if(!nextName){
    nextName='Fajr';
    nextTime = isoToDate(fajrTomorrowISO);
  }

  setText('nextPrayerName', translatePrayer(nextName));
  setText('nextPrayerTime', formatTime12h(nextTime));

  if(nextTimer) clearInterval(nextTimer);
  nextTimer = setInterval(()=>{
    const diff = nextTime - new Date();
    if(diff <= 0){
      setText('nextCountdown','حان الوقت');
      clearInterval(nextTimer);
      return;
    }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    setText('nextCountdown', `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  }, 1000);
}

async function updateQiblaFromCoords(lat, lon){
  const b = initialBearing(lat, lon, KAABA.lat, KAABA.lon);
  setText('qiblaDeg', `${b.toFixed(1)}°`);
  // store last bearing
  LS('qiblaBearing', String(b));
}

function loadStoredQibla(){
  const v = LS('qiblaBearing');
  if(v) setText('qiblaDeg', `${parseFloat(v).toFixed(1)}°`);
}

// Compass
let headingEMA = null;
function shortestDelta(a, b){
  // delta from a to b (degrees) in [-180,180]
  let d = (b - a + 540) % 360 - 180;
  return d;
}

function setupCompass(){
  const needle = qs('#needle');
  const accuracyEl = qs('#compassAccuracy');

  function renderNeedle(qibla, heading){
    const rot = normalize360(qibla - heading);
    needle.style.transform = `translate(-50%,-100%) rotate(${rot}deg)`;
  }

  function onOri(ev){
    let heading = null;
    if(typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0){
      heading = ev.webkitCompassHeading;
      if(typeof ev.webkitCompassAccuracy === 'number'){
        accuracyEl.textContent = `دقة البوصلة: ±${Math.round(ev.webkitCompassAccuracy)}°`;
      }
    } else if(typeof ev.alpha === 'number'){
      heading = 360 - ev.alpha;
      accuracyEl.textContent = 'دقة البوصلة: تقريبية';
    }
    if(heading == null) return;

    // EMA smoothing
    const q = parseFloat((LS('qiblaBearing')||'0')) || 0;
    if(headingEMA == null) headingEMA = heading;
    const delta = shortestDelta(headingEMA, heading);
    headingEMA = normalize360(headingEMA + delta * 0.18);

    renderNeedle(q, headingEMA);
  }

  qs('#enableCompass').addEventListener('click', async ()=>{
    try {
      if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
        const p = await DeviceOrientationEvent.requestPermission();
        if(p !== 'granted') return;
      }
      window.addEventListener('deviceorientation', onOri, true);
      setText('compassStatus', 'تم تفعيل البوصلة');
    } catch(e) {
      setText('compassStatus', 'تعذّر تفعيل البوصلة');
    }
  });
}

// Adhkar
function formatRepeat(rem){ return rem===0 ? 'تم' : `التكرار: ${rem}`; }

async function loadAdhkar(){
  const res = await fetch('./data/adhkar.json');
  const data = await res.json();
  const mapping = [
    {id:'morning', key:'morning', title:'أذكار الصباح'},
    {id:'evening', key:'evening', title:'أذكار المساء'},
    {id:'sleep', key:'sleep', title:'أذكار النوم'},
    {id:'afterPrayer', key:'afterPrayer', title:'أذكار دبر الصلوات'},
    {id:'daily', key:'daily', title:'أذكار متفرقة'}
  ];

  mapping.forEach(m=>{
    const host = qs('#'+m.id);
    host.innerHTML = `<h3>${m.title}</h3>`;
    (data[m.key]||[]).forEach((it, i)=>{
      const max = it.repeat || 1;
      const storageKey = `dhikr:${m.key}:${i}:${dayKey()}`;
      let rem = LS(storageKey);
      rem = rem==null ? max : parseInt(rem,10);

      const card = document.createElement('div');
      card.className='dhikr-card';

      const progress = Math.round(((max-rem)/max)*100);

      card.innerHTML = `
        <p class="dhikr-text">${it.text}</p>
        <div class="small">المصدر: ${it.source || '—'}</div>
        <div class="progress"><div style="width:${progress}%"></div></div>
        <div class="actions">
          <div class="left">
            <button class="btn secondary copy">نسخ</button>
            <a class="btn secondary" href="${it.ref || '#'}" target="_blank" rel="noopener">مرجع</a>
          </div>
          <button class="btn do">${formatRepeat(rem)}</button>
        </div>
      `;

      card.querySelector('.copy').addEventListener('click', async ()=>{
        try { await navigator.clipboard.writeText(it.text); } catch(e) {}
      });

      const btn = card.querySelector('.do');
      const bar = card.querySelector('.progress > div');

      btn.addEventListener('click', ()=>{
        if(rem<=0) return;
        rem -= 1;
        LS(storageKey, String(rem));
        const pct = Math.round(((max-rem)/max)*100);
        bar.style.width = pct + '%';
        btn.textContent = formatRepeat(rem);
        if(rem===0 && navigator.vibrate) navigator.vibrate([120,50,120]);
        else if(navigator.vibrate) navigator.vibrate(40);
      });

      host.appendChild(card);
    });
  });
}

// Tasbeeh
function setupTasbeeh(){
  let count = parseInt(LS('tasbeehCount')||'0',10);
  const disp = qs('#tasbeehCount');
  disp.textContent = count;

  qs('#tasbeehBtn').addEventListener('click', ()=>{
    count += 1;
    disp.textContent = count;
    LS('tasbeehCount', String(count));
    if(navigator.vibrate) navigator.vibrate(25);
    if(count%33===0 && navigator.vibrate) navigator.vibrate([120,50,120]);
  });

  qs('#tasbeehReset').addEventListener('click', ()=>{
    count = 0;
    disp.textContent = count;
    LS('tasbeehCount', '0');
  });
}

// Resources
async function loadResources(){
  const res = await fetch('./data/resources.json');
  const data = await res.json();

  function renderList(id, list){
    const host = qs('#'+id);
    host.innerHTML = '';
    list.forEach(it=>{
      const li = document.createElement('li');
      li.innerHTML = `<a href="${it.url}" target="_blank" rel="noopener">${it.title}</a> <span class="small">— ${it.desc}</span>`;
      host.appendChild(li);
    });
  }

  renderList('resQuran', data.quran||[]);
  renderList('resHadith', data.hadith||[]);
  renderList('resFatwa', data.fatwa||[]);
}

// PWA SW
function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js', {scope:'./'}).catch(()=>{});
  }
}

async function init(){
  CFG = await (await fetch('./assets/js/config.json')).json();
  renderVersion();
  initTheme();
  initNav();
  initCityList();
  renderHijri();
  loadStoredQibla();
  setupCompass();

  qs('#useLocation').addEventListener('click', ()=> loadPrayerTimes({forceCity:false}));
  qs('#useCity').addEventListener('click', ()=> loadPrayerTimes({forceCity:true}));

  await loadPrayerTimes({forceCity:false});
  await loadAdhkar();
  setupTasbeeh();
  await loadResources();

  registerSW();
}

window.addEventListener('load', init);
