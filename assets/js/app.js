// Rafiq Muslim v0.7.2 - Fixed Location & API Fetch
const API_BASE = 'https://api.aladhan.com/v1';
const qs = (s, r = document) => r.querySelector(s);
const setText = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };

// دالة جلب اسم المدينة من الإحداثيات
async function reverseGeocodeCity(lat, lon) {
    try {
        const r = await fetch(`https://api-bdc.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`);
        const data = await r.json();
        return data.city || data.locality || "موقعي الحالي";
    } catch (e) { return "موقعي الحالي"; }
}

// دالة جلب أوقات الصلاة من API المؤذن
async function fetchTimes(lat, lon) {
    try {
        const r = await fetch(`${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=4`);
        const data = await r.json();
        if (data.code === 200) {
            updateUI(data.data);
        }
    } catch (e) {
        console.error("خطأ في جلب الأوقات:", e);
    }
}

// تحديث الواجهة بالبيانات المستلمة
function updateUI(data) {
    const t = data.timings;
    // تحديث الجدول (بناءً على المعرفات في index.html)
    setText('t_fajr_s', t.Fajr);
    setText('t_dhuhr_s', t.Dhuhr);
    setText('t_asr_s', t.Asr);
    setText('t_maghrib_s', t.Maghrib);
    setText('t_isha_s', t.Isha);
    setText('hijri', data.date.hijri.date);
    // يمكن إضافة منطق حساب العد التنازلي هنا
}

async function loadPrayerTimes(forceCity = false) {
    const ptStatus = qs('#ptStatus');
    if (ptStatus) { ptStatus.style.display = 'none'; }

    if (!forceCity && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude: lat, longitude: lon } = pos.coords;
                
                // 1. تحديث اسم المدينة
                const cityName = await reverseGeocodeCity(lat, lon);
                setText('cityDisplay', cityName);
                
                // 2. جلب الأوقات الفعلية
                await fetchTimes(lat, lon);
            },
            (err) => {
                // معالجة الخطأ هنا بدلاً من throw
                if (ptStatus) {
                    ptStatus.style.display = 'block';
                    ptStatus.className = 'small location-error';
                    ptStatus.textContent = 'يرجى تفعيل صلاحية الموقع في المتصفح.';
                }
            },
            { timeout: 10000 }
        );
    }
}

// ربط الأزرار عند تحميل الصفحة
window.addEventListener('load', () => {
    loadPrayerTimes();
    
    // تفعيل زر الموقع اليدوي 📍
    const locBtn = document.getElementById('useLocation');
    if (locBtn) {
        locBtn.addEventListener('click', () => loadPrayerTimes(false));
    }
});
