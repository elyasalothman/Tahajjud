import { APP_CONFIG } from './config.js';

// Util: 12-hour formatting in Arabic locale
function formatTime12h(date){
  // Intl with hour12 true ensures 12-hour clock; Arabic locale
  try {
    return new Intl.DateTimeFormat('ar', {hour:'numeric', minute:'2-digit', hour12:true}).format(date);
  } catch(e){
    // fallback manual
    let h = date.getHours();
    const m = String(date.getMinutes()).padStart(2,'0');
    const suffix = h>=12 ? 'م' : 'ص';
    h = h%12; if(h===0) h=12;
    return `${h}:${m} ${suffix}`;
  }
}

function qs(sel){return document.querySelector(sel)}

const API_BASE = 'https://api.aladhan.com/v1';

async function fetchTimingsByCoords(date, lat, lon){
  const dstr = `${date.getDate().toString().padStart(2,'0')}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getFullYear()}`;
  const url = `${API_BASE}/timings/${dstr}?latitude=${lat}&longitude=${lon}&method=${APP_CONFIG.calculation.method}&school=${APP_CONFIG.calculation.school}&iso8601=true`;
  const r = await fetch(url); const j = await r.json(); if(j.code!==200) throw new Error('API error');
  return j.data;
}

async function fetchTimingsByCity(date, city, country){
  const dstr = `${date.getDate().toString().padStart(2,'0')}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getFullYear()}`;
  const url = `${API_BASE}/timingsByCity/${dstr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${APP_CONFIG.calculation.method}&school=${APP_CONFIG.calculation.school}&iso8601=true`;
  const r = await fetch(url); const j = await r.json(); if(j.code!==200) throw new Error('API error');
  return j.data;
}

function parseISOToLocal(isoStr){
  // API returns like 2026-03-28T04:16+03:00
  return new Date(isoStr);
}

function computeDuha(sunriseISO, dhuhrISO){
  const start = new Date(new Date(sunriseISO).getTime() + APP_CONFIG.duha.startOffsetMinutesAfterSunrise*60000);
  const end = new Date(new Date(dhuhrISO).getTime() - APP_CONFIG.duha.endOffsetMinutesBeforeDhuhr*60000);
  return {start, end};
}

function computeLastThird(maghribISO, fajrNextISO){
  const magh = new Date(maghribISO);
  const fajr = new Date(fajrNextISO);
  let nightMs = fajr - magh; if (nightMs <=0){ nightMs += 24*3600*1000; }
  const third = nightMs/3;
  const start = new Date(fajr.getTime() - third);
  return {start, end: fajr};
}

function setText(id, text){ const el = document.getElementById(id); if(el) el.textContent = text; }

async function loadTimings(lat, lon, cityFallback){
  try {
    const today = new Date();
    const tomorrow = new Date(Date.now()+24*3600*1000);
    const tdata = lat!=null? await fetchTimingsByCoords(today, lat, lon) : await fetchTimingsByCity(today, cityFallback.city, cityFallback.country);
    const tdataTomorrow = lat!=null? await fetchTimingsByCoords(tomorrow, lat, lon) : await fetchTimingsByCity(tomorrow, cityFallback.city, cityFallback.country);

    const T = tdata.timings; const TT = tdataTomorrow.timings;

    // fill UI (12h)
    const keys = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
    keys.forEach(k=>{
      const d = parseISOToLocal(T[k]);
      setText('t_'+k.toLowerCase(), formatTime12h(d));
    });

    // Duha
    const duha = computeDuha(T['Sunrise'], T['Dhuhr']);
    setText('t_duha', `${formatTime12h(duha.start)} – ${formatTime12h(duha.end)}`);

    // Last third of night
    const lastThird = computeLastThird(T['Maghrib'], TT['Fajr']);
    setText('t_lastthird', `${formatTime12h(lastThird.start)} – ${formatTime12h(lastThird.end)}`);

    // Next prayer countdown
    computeNextPrayerCountdown(T);

  } catch(err){
    console.error(err);
    setText('status', 'تعذّر تحديث المواقيت. اختر مدينة أو فعّل الموقع.');
  }
}

function computeNextPrayerCountdown(timings){
  const order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
  const now = new Date();
  let nextName=null, nextTime=null;
  for(const k of order){
    const d = new Date(timings[k]);
    if(d>now){ nextName=k; nextTime=d; break; }
  }
  if(!nextName){
    // next is tomorrow Fajr; handled implicitly on refresh
    setText('next_name','فجر الغد');
    setText('next_countdown','—');
    return;
  }
  setText('next_name', translateName(nextName));
  const tick = ()=>{
    const diff = nextTime - new Date();
    if(diff<=0){ setText('next_countdown','حان الوقت'); return; }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    setText('next_countdown', `${h}س ${m}د`);
    requestAnimationFrame(()=>setTimeout(tick, 1000*20));
  };
  tick();
}

function translateName(name){
  const map={Fajr:'الفجر', Dhuhr:'الظهر', Asr:'العصر', Maghrib:'المغرب', Isha:'العشاء'};
  return map[name]||name;
}

// Geolocation flow
async function initLocation(){
  setText('status','');
  if(!('geolocation' in navigator)){
    setText('status','جهازك لا يدعم تحديد الموقع.');
    await loadTimings(null,null, APP_CONFIG.ui.defaultCity);
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos)=>{
    await loadTimings(pos.coords.latitude, pos.coords.longitude, APP_CONFIG.ui.defaultCity);
  }, async (err)=>{
    console.warn('geo denied', err);
    setText('status','لم نتمكن من استخدام الموقع. استخدم اختيار المدينة.');
    await loadTimings(null,null, APP_CONFIG.ui.defaultCity);
  },{enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}

// City selector minimal
function setupCitySelector(){
  const sel = document.getElementById('city');
  const cities = [
    {city:'Riyadh', country:'SA', label:'الرياض'},
    {city:'Makkah', country:'SA', label:'مكة المكرمة'},
    {city:'Al Madinah al Munawwarah', country:'SA', label:'المدينة المنورة'},
    {city:'Jeddah', country:'SA', label:'جدة'},
    {city:'Dammam', country:'SA', label:'الدمام'}
  ];
  for(const c of cities){
    const opt = document.createElement('option'); opt.value = JSON.stringify({city:c.city,country:c.country}); opt.textContent=c.label; sel.appendChild(opt);
  }
  sel.addEventListener('change', async ()=>{
    const obj = JSON.parse(sel.value);
    await loadTimings(null,null,obj);
  });
}

// Qibla calculation and compass
const KAABA = {lat:21.4225, lon:39.8262};
function toRad(x){return x*Math.PI/180}
function toDeg(x){return x*180/Math.PI}
function initialBearing(lat1, lon1, lat2, lon2){
  const φ1=toRad(lat1), φ2=toRad(lat2), λ1=toRad(lon1), λ2=toRad(lon2);
  const y = Math.sin(λ2-λ1)*Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
  let θ = Math.atan2(y,x);
  θ = (toDeg(θ)+360)%360; // from true north
  return θ;
}

async function updateQibla(){
  if(!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition((pos)=>{
    const b = initialBearing(pos.coords.latitude, pos.coords.longitude, KAABA.lat, KAABA.lon);
    setText('qibla_bearing', `${b.toFixed(1)}°`);
  });
}

function setupCompass(){
  const arrow = document.getElementById('compass_arrow');
  function setRotation(deg){ arrow.style.transform = `rotate(${deg}deg)`; }
  function normalize(a){ return (a%360+360)%360; }
  function onOrientation(ev){
    let heading=null;
    if(typeof ev.webkitCompassHeading === 'number'){
      heading = ev.webkitCompassHeading; // relative to magnetic north (iOS)
    } else if(typeof ev.alpha === 'number'){
      heading = 360 - ev.alpha; // best-effort
    }
    const q = parseFloat(document.getElementById('qibla_bearing').textContent)||0;
    if(heading!=null){
      const relative = normalize(q - heading);
      setRotation(relative);
    }
  }
  
  const btn = document.getElementById('enable_compass');
  btn.addEventListener('click', async ()=>{
    if(window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function'){
      try{ const p = await DeviceOrientationEvent.requestPermission(); if(p!=='granted') return; }catch(e){ console.warn(e); }
    }
    window.addEventListener('deviceorientation', onOrientation, true);
  });
}

function renderVersion(){
  setText('app_version', APP_CONFIG.version);
}

window.addEventListener('load', async ()=>{
  renderVersion();
  setupCitySelector();
  await initLocation();
  await updateQibla();
  setupCompass();
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('./service-worker.js'); }
});
