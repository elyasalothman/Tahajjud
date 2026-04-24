import { qs, setText, LS, haptic } from './app.js';

const KAABA = {lat: 21.4225, lon: 39.8262};

function toRad(x) { return x * Math.PI / 180; } 
function toDeg(x) { return x * 180 / Math.PI; } 
function normalize360(x) { x %= 360; if(x < 0) x += 360; return x; }

function bearing(lat1, lon1, lat2, lon2) {
    const φ1 = toRad(lat1), φ2 = toRad(lat2), λ1 = toRad(lon1), λ2 = toRad(lon2); 
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1); 
    return normalize360(toDeg(Math.atan2(y, x)));
}

export function setQiblaFromCoords(lat, lon) {
    const b = bearing(lat, lon, KAABA.lat, KAABA.lon); 
    setText('qiblaDeg', `${b.toFixed(1)}°`); 
    LS('qiblaBearing', String(b));
}

export function loadStoredQibla() {
    const v = LS('qiblaBearing'); 
    if(v) setText('qiblaDeg', `${parseFloat(v).toFixed(1)}°`);
}

export function setupCompass() {
    const needle = qs('#needle'), acc = qs('#compassAccuracy'); 
    if (!needle) return; 

    let lastHeading = null;
    let isAligned = false; // تتبع حالة التطابق لمنع الاهتزاز المستمر

    function render(q, h) {
        // حساب الزاوية النهائية
        const angle = normalize360(q - h);
        needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
        
        // التحقق من التطابق مع القبلة (بفارق 4 درجات يميناً أو يساراً لتسهيل التثبيت)
        if (angle < 4 || angle > 356) {
            if (!isAligned) {
                haptic([40, 50, 40]); // نبضتان خفيفتان عند تحديد القبلة بدقة
                isAligned = true;
            }
            needle.style.background = '#10b981'; // لون أخضر عند التطابق
            needle.style.boxShadow = '0 0 20px #10b981';
            acc.innerHTML = '<span style="color:#10b981; font-weight:bold; font-size:1.3rem;">أنت متجه للقبلة الآن ✅</span>';
        } else {
            isAligned = false; // إعادة ضبط الحالة عند الخروج عن مسار القبلة
            needle.style.background = 'var(--danger)'; // اللون الأساسي (أحمر)
            needle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
            acc.textContent = 'قم بالدوران حتى يتجه السهم للأعلى (ويصبح أخضر)';
            acc.style.color = 'var(--muted)';
        }
    } 

    function onOri(ev) {
        let heading = null; 
        if (typeof ev.webkitCompassHeading === 'number' && ev.webkitCompassHeading >= 0) { heading = ev.webkitCompassHeading; } 
        else if (typeof ev.alpha === 'number') { heading = (ev.absolute !== false) ? 360 - ev.alpha : null; }
        if (heading === null) return;
        const qibla = parseFloat(LS('qiblaBearing') || '0') || 0;
        if (lastHeading === null) { lastHeading = heading; } else { let diff = heading - lastHeading; if (diff > 180) diff -= 360; if (diff < -180) diff += 360; lastHeading += diff * 0.08; }
        render(qibla, lastHeading);
    }

    const btn = qs('#enableCompass');
    if (btn) {
        btn.addEventListener('click', async () => {
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try { const p = await DeviceOrientationEvent.requestPermission(); if (p === 'granted') { window.addEventListener('deviceorientation', onOri, true); btn.style.display = 'none'; } else { acc.textContent = 'تم رفض تصريح البوصلة'; } } catch (e) { acc.textContent = 'خطأ في تفعيل الحساس'; }
            } else {
                window.addEventListener('deviceorientationabsolute', onOri, true);
                btn.style.display = 'none';
            }
            
            // منع إطفاء الشاشة عند تشغيل البوصلة
            if ('wakeLock' in navigator && !window.compassWakeLock) {
                navigator.wakeLock.request('screen').then(lock => window.compassWakeLock = lock).catch(()=>{});
            }
        });
    }
}