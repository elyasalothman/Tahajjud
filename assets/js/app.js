// Rafiq Muslim - Pro Fix v0.9.0
const API_BASE = 'https://api.aladhan.com/v1';

const updateUI = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// 1. إدارة الأذكار (إظهار التصنيفات والمحتوى)
async function loadAdhkar() {
    try {
        const res = await fetch('./assets/data/adhkar.json');
        const data = await res.json();
        const container = document.getElementById('adhkarContainer');
        const pills = document.getElementById('adhkarPills');
        
        const categories = {
            morning: "الصباح", evening: "المساء", sleep: "النوم", 
            afterPrayer: "بعد الصلاة", daily: "أذكار عامة"
        };

        pills.innerHTML = '';
        Object.keys(categories).forEach(key => {
            if(data[key]) {
                const btn = document.createElement('button');
                btn.textContent = categories[key];
                btn.onclick = () => renderCategory(data[key], key);
                pills.appendChild(btn);
            }
        });

        // عرض أول تصنيف تلقائياً
        renderCategory(data.morning, 'morning');
    } catch (e) { console.error("Error loading Adhkar:", e); }
}

function renderCategory(items, key) {
    const container = document.getElementById('adhkarContainer');
    container.innerHTML = items.map((item, index) => `
        <div class="card inner-card" style="margin-bottom:15px">
            <p class="dhikr-text" style="font-size:1.4rem">${item.text}</p>
            <div class="pager-meta"><span>المصدر: ${item.source}</span></div>
            <button class="repeat-square" id="btn-${key}-${index}" onclick="countDhikr('${key}-${index}', ${item.repeat})">
                ${item.repeat}
            </button>
        </div>
    `).join('');
}

window.countDhikr = (id, max) => {
    const btn = document.getElementById(`btn-${id}`);
    let current = parseInt(btn.textContent);
    if (current > 0) {
        btn.textContent = current - 1;
        if (current - 1 === 0) btn.style.background = "var(--accent2)";
    }
};

// 2. إدارة أوقات الصلاة والعد التنازلي
async function initApp() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            const res = await fetch(`${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=4`);
            const data = await res.json();
            if (data.code === 200) renderPrayerData(data.data);
        });
    }
}

function renderPrayerData(data) {
    const t = data.timings;
    
    // تعبئة الجدول بالكامل
    updateUI('t_fajr_s', t.Fajr); updateUI('t_fajr_e', t.Sunrise);
    updateUI('t_dhuhr_s', t.Dhuhr); updateUI('t_dhuhr_e', t.Asr);
    updateUI('t_asr_s', t.Asr); updateUI('t_asr_e', t.Maghrib);
    updateUI('t_maghrib_s', t.Maghrib); updateUI('t_maghrib_e', t.Isha);
    updateUI('t_isha_s', t.Isha); updateUI('t_isha_true_s', t.Isha);
    updateUI('t_lastthird_s', t.Lastthird);
    
    updateUI('hijri', `${data.date.hijri.day} ${data.date.hijri.month.ar} ${data.date.hijri.year}`);
    updateUI('cityDisplay', "الرياض"); // أو جلبها ديناميكياً

    startCountdown(t);
}

function startCountdown(timings) {
    const prayers = [
        { name: "الفجر", time: timings.Fajr },
        { name: "الظهر", time: timings.Dhuhr },
        { name: "العصر", time: timings.Asr },
        { name: "المغرب", time: timings.Maghrib },
        { name: "العشاء", time: timings.Isha }
    ];

    setInterval(() => {
        const now = new Date();
        let next = null;

        for (let p of prayers) {
            const [h, m] = p.time.split(':');
            const pDate = new Date(); pDate.setHours(h, m, 0);
            if (pDate > now) { next = { ...p, date: pDate }; break; }
        }

        if (!next) { // حالة ما بعد العشاء (فجر الغد)
            const [h, m] = prayers[0].time.split(':');
            const pDate = new Date(); pDate.setDate(pDate.getDate() + 1); pDate.setHours(h, m, 0);
            next = { ...prayers[0], date: pDate };
        }

        updateUI('nextPrayerName', next.name);
        updateUI('nextPrayerTime', next.time);
        
        const diff = next.date - now;
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        updateUI('nextCountdown', `${hrs}:${mins < 10 ? '0'+mins : mins}:${secs < 10 ? '0'+secs : secs}`);
    }, 1000);
}

// 3. التنقل بين الأقسام
document.querySelectorAll('.bottom-nav button').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(btn.dataset.target).classList.add('active');
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

window.onload = () => { initApp(); loadAdhkar(); };
