// Rafiq Muslim Pro v3.0.0 - AR Qibla Edition
const API_BASE = 'https://api.aladhan.com/v1';
const KAABA = { lat: 21.4225, lon: 39.8262 };

const dom = (id) => document.getElementById(id);
const vib = (ms) => { if(navigator.vibrate) navigator.vibrate(ms); };

// --- 1. القبلة بالواقع المعزز ---
let arActive = false;
async function initAR() {
    const btn = dom('toggleAR');
    btn.onclick = async () => {
        if (!arActive) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                dom('ar-video').srcObject = stream;
                dom('ar-container').style.display = 'block';
                dom('classicCompass').style.display = 'none';
                arActive = true;
                btn.textContent = "إيقاف الكاميرا ❌";
            } catch (e) { alert("الكاميرا غير متاحة"); }
        } else {
            const stream = dom('ar-video').srcObject;
            stream.getTracks().forEach(t => t.stop());
            dom('ar-container').style.display = 'none';
            dom('classicCompass').style.display = 'block';
            arActive = false;
            btn.textContent = "تفعيل القبلة بالكاميرا (AR) 📷";
        }
    };
}

function calculateQibla(lat, lon) {
    const phiK = KAABA.lat * Math.PI/180;
    const lambdaK = KAABA.lon * Math.PI/180;
    const phi = lat * Math.PI/180;
    const lambda = lon * Math.PI/180;
    const y = Math.sin(lambdaK - lambda);
    const x = Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
    let q = Math.atan2(y, x) * 180/Math.PI;
    return (q + 360) % 360;
}

// --- 2. إدارة البيانات والصلاة ---
async function setupApp() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const qibla = calculateQibla(lat, lon);
        dom('qiblaDeg').textContent = Math.round(qibla) + "°";
        
        // تدوير الإبرة والمؤشر
        window.addEventListener('deviceorientationabsolute', (e) => {
            const heading = e.alpha || e.webkitCompassHeading;
            if (heading) {
                const diff = qibla - heading;
                dom('needle').style.transform = `translate(-50%, -100%) rotate(${diff}deg)`;
                dom('arPointer').style.transform = `rotate(${diff - 45}deg)`;
            }
        });

        const res = await fetch(`${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=4`).then(r => r.json());
        renderUI(res.data);
    });
}

function renderUI(data) {
    const t = data.timings;
    dom('prayerTableBody').innerHTML = `
        <tr><th>الفجر</th><td>${t.Fajr}</td><td>${t.Sunrise}</td></tr>
        <tr><th>الظهر</th><td>${t.Dhuhr}</td><td>${t.Asr}</td></tr>
        <tr><th>المغرب</th><td>${t.Maghrib}</td><td>${t.Isha}</td></tr>
    `;
    dom('hijriDisplay').textContent = `${data.date.hijri.day} ${data.date.hijri.month.ar}`;
    startTimer(t);
}

function startTimer(timings) {
    const list = [{n:"الفجر",t:timings.Fajr}, {n:"الظهر",t:timings.Dhuhr}, {n:"العصر",t:timings.Asr}, {n:"المغرب",t:timings.Maghrib}, {n:"العشاء",t:timings.Isha}];
    setInterval(() => {
        const now = new Date();
        let next = list.find(p => {
            const [h,m] = p.t.split(':');
            const d = new Date(); d.setHours(h,m,0);
            return d > now;
        }) || { ...list[0], nextDay: true };

        const [h,m] = next.t.split(':');
        const target = new Date(); target.setHours(h,m,0);
        if (next.nextDay) target.setDate(target.getDate() + 1);

        dom('nextPrayerName').textContent = next.n;
        const diff = target - now;
        const hh = Math.floor(diff/3600000), mm = Math.floor((diff%3600000)/60000), ss = Math.floor((diff%60000)/1000);
        dom('nextCountdown').textContent = `${hh}:${mm<10?'0'+mm:mm}:${ss<10?'0'+ss:ss}`;
    }, 1000);
}

// --- 3. المسبحة والأذكار ---
dom('mainTasbeehBtn').onclick = () => {
    let c = parseInt(dom('tasbeehCount').textContent) + 1;
    dom('tasbeehCount').textContent = c;
    vib(c % 33 === 0 ? 100 : 40);
};

window.onload = () => { setupApp(); initAR(); };
