// Rafiq Muslim - Master Fix v0.8.5
const API_BASE = 'https://api.aladhan.com/v1';

// دالة مساعدة لتحديث النصوص في الواجهة بأمان
const updateUI = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// 1. جلب البيانات (الأذكار والفوائد)
async function loadAppData() {
    try {
        const response = await fetch('./assets/data/benefits.json');
        const benefits = await response.json();
        const randomBenefit = benefits[Math.floor(Math.random() * benefits.length)];
        updateUI('dailyBenefitContent', randomBenefit);
    } catch (err) {
        console.error("فشل تحميل الفوائد:", err);
    }
}

// 2. إدارة أوقات الصلاة والموقع
async function initPrayerTimes() {
    const ptStatus = document.getElementById('ptStatus');
    if (ptStatus) ptStatus.style.display = 'none';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            
            // جلب اسم المدينة
            try {
                const cityRes = await fetch(`https://api-bdc.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`);
                const cityData = await cityRes.json();
                updateUI('cityDisplay', cityData.city || "موقعي الحالي");
            } catch (e) { updateUI('cityDisplay', "موقعي"); }

            // جلب الأوقات الفعلية
            fetchPrayerTimes(lat, lon);
        }, (err) => {
            if (ptStatus) {
                ptStatus.style.display = 'block';
                ptStatus.textContent = 'يرجى تفعيل صلاحية الموقع لتحديث الأوقات.';
            }
        });
    }
}

async function fetchPrayerTimes(lat, lon) {
    try {
        const res = await fetch(`${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=4`);
        const data = await res.json();
        if (data.code === 200) {
            renderTimes(data.data);
        }
    } catch (err) { console.error("API Error:", err); }
}

function renderTimes(data) {
    const t = data.timings;
    
    // تحديث الجدول (المعرفات مطابقة لـ index.html)
    updateUI('t_fajr_s', t.Fajr);
    updateUI('t_fajr_e', t.Sunrise); // الشروق هو نهاية وقت الفجر
    updateUI('t_dhuhr_s', t.Dhuhr);
    updateUI('t_asr_s', t.Asr);
    updateUI('t_maghrib_s', t.Maghrib);
    updateUI('t_isha_s', t.Isha);
    updateUI('t_isha_true_s', t.Isha);
    
    updateUI('hijri', `${data.date.hijri.day} ${data.date.hijri.month.ar} ${data.date.hijri.year}`);
    
    setupCountdown(t);
}

function setupCountdown(timings) {
    const prayerOrder = [
        { name: "الفجر", time: timings.Fajr },
        { name: "الظهر", time: timings.Dhuhr },
        { name: "العصر", time: timings.Asr },
        { name: "المغرب", time: timings.Maghrib },
        { name: "العشاء", time: timings.Isha }
    ];

    setInterval(() => {
        const now = new Date();
        let next = null;

        for (let p of prayerOrder) {
            const [h, m] = p.time.split(':');
            const pDate = new Date();
            pDate.setHours(h, m, 0);

            if (pDate > now) {
                next = { name: p.name, time: pDate, clock: p.time };
                break;
            }
        }

        if (next) {
            updateUI('nextPrayerName', next.name);
            updateUI('nextPrayerTime', next.clock);
            
            const diff = next.time - now;
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            updateUI('nextCountdown', `${hours}:${mins < 10 ? '0'+mins : mins}:${secs < 10 ? '0'+secs : secs}`);
        }
    }, 1000);
}

// 3. التحكم في التنقل (Tabs)
document.querySelectorAll('.bottom-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// التشغيل الابتدائي
window.addEventListener('load', () => {
    loadAppData();
    initPrayerTimes();
});
