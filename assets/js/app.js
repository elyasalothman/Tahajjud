// Rafiq Muslim - Master Fix v0.8.0
const API_BASE = 'https://api.aladhan.com/v1';

// دالة مساعدة للتعامل مع العناصر بصورة آمنة
const updateElement = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
};

// تحميل البيانات (أذكار، فوائد، إلخ)
async function loadData() {
    try {
        const [adhkarRes, benefitsRes] = await Promise.allSettled([
            fetch('assets/data/adhkar.json').then(res => res.json()),
            fetch('assets/data/benefits.json').then(res => res.json())
        ]);

        if (adhkarRes.status === 'fulfilled') {
            const adhkar = adhkarRes.value;
            const randomDhikr = adhkar[Math.floor(Math.random() * adhkar.length)];
            updateElement('adhkar-text', randomDhikr.content || randomDhikr.text);
        }

        if (benefitsRes.status === 'fulfilled') {
            const benefits = benefitsRes.value;
            const randomBenefit = benefits[Math.floor(Math.random() * benefits.length)];
            updateElement('benefit-text', randomBenefit.content || randomBenefit.text);
        }
    } catch (err) {
        console.error("خطأ في تحميل البيانات:", err);
    }
}

// جلب أوقات الصلاة
async function updatePrayerTimes() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`${API_BASE}/timings?latitude=${latitude}&longitude=${longitude}&method=4`);
                const data = await response.json();
                if (data.code === 200) {
                    displayPrayerTimes(data.data);
                }
            } catch (err) {
                console.error("خطأ في الاتصال بـ API:", err);
            }
        }, (error) => {
            updateElement('city_name', 'يرجى تفعيل الموقع الجغرافي');
        });
    }
}

function displayPrayerTimes(data) {
    const timings = data.timings;
    const prayers = {
        'Fajr': 't_fajr',
        'Sunrise': 't_sunrise',
        'Dhuhr': 't_dhuhr',
        'Asr': 't_asr',
        'Maghrib': 't_maghrib',
        'Isha': 't_isha'
    };

    for (const [key, id] of Object.entries(prayers)) {
        updateElement(id, timings[key].split(' ')[0]);
    }

    updateElement('city_name', data.meta.timezone);
    updateElement('hijri_date', `${data.date.hijri.day} ${data.date.hijri.month.ar} ${data.date.hijri.year}`);
    
    startCountdown(timings);
}

function startCountdown(timings) {
    const prayerOrder = [
        { name: "الفجر", key: "Fajr" },
        { name: "الشروق", key: "Sunrise" },
        { name: "الظهر", key: "Dhuhr" },
        { name: "العصر", key: "Asr" },
        { name: "المغرب", key: "Maghrib" },
        { name: "العشاء", key: "Isha" }
    ];

    const timer = setInterval(() => {
        const now = new Date();
        let nextPrayer = null;

        for (let p of prayerOrder) {
            const [hours, minutes] = timings[p.key].split(':');
            const pDate = new Date();
            pDate.setHours(parseInt(hours), parseInt(minutes), 0);

            if (pDate > now) {
                nextPrayer = { name: p.name, time: pDate };
                break;
            }
        }

        // إذا انتهت كل صلوات اليوم، الصلاة القادمة هي فجر الغد
        if (!nextPrayer) {
            const [hours, minutes] = timings['Fajr'].split(':');
            const pDate = new Date();
            pDate.setDate(pDate.getDate() + 1);
            pDate.setHours(parseInt(hours), parseInt(minutes), 0);
            nextPrayer = { name: "الفجر", time: pDate };
        }

        const diff = nextPrayer.time - now;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        updateElement('next_prayer_name', nextPrayer.name);
        updateElement('countdown', `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`);
    }, 1000);
}

// التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updatePrayerTimes();
});
