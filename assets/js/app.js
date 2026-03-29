// Rafiq Muslim - Stable Core v0.7.0

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. نظام التنقل السلس ---
    const navBtns = document.querySelectorAll('.bottom-nav button');
    const sections = document.querySelectorAll('.section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // إزالة التفعيل من الجميع
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            // تفعيل الزر والقسم المختار
            btn.classList.add('active');
            const targetSection = document.getElementById(btn.dataset.target);
            if(targetSection) targetSection.classList.add('active');
            window.scrollTo(0, 0);
        });
    });

    // --- 2. جلب أوقات الصلاة ---
    async function fetchPrayerTimes() {
        try {
            const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Riyadh&country=SA&method=4');
            const data = await res.json();
            
            if(data.code === 200) {
                const t = data.data.timings;
                
                // تحويل الوقت لصيغة 12 ساعة (اختياري، حالياً 24 ساعة للثبات)
                document.getElementById('t_fajr').textContent = t.Fajr;
                document.getElementById('t_dhuhr').textContent = t.Dhuhr;
                document.getElementById('t_asr').textContent = t.Asr;
                document.getElementById('t_maghrib').textContent = t.Maghrib;
                document.getElementById('t_isha').textContent = t.Isha;

                // التاريخ الهجري
                const hijriDate = data.data.date.hijri;
                document.getElementById('hijriDate').textContent = `${hijriDate.day} ${hijriDate.month.ar} ${hijriDate.year}`;
                
                // حفظ اتجاه القبلة للبوصلة
                localStorage.setItem('qiblaDirection', data.data.meta.qibla);
            }
        } catch (error) {
            console.error('خطأ في الاتصال بالانترنت:', error);
            document.getElementById('hijriDate').textContent = "بدون اتصال";
        }
    }
    fetchPrayerTimes();

    // --- 3. نظام المسبحة ---
    let tasbeehCount = parseInt(localStorage.getItem('tasbeehCount') || '0', 10);
    const countDisplay = document.getElementById('tasbeehCount');
    
    if(countDisplay) countDisplay.textContent = tasbeehCount;

    document.getElementById('tasbeehBtn')?.addEventListener('click', () => {
        tasbeehCount++;
        countDisplay.textContent = tasbeehCount;
        localStorage.setItem('tasbeehCount', tasbeehCount);
        
        // اهتزاز خفيف إذا كان مدعوماً
        if(navigator.vibrate) navigator.vibrate(15);
    });

    document.getElementById('tasbeehReset')?.addEventListener('click', () => {
        tasbeehCount = 0;
        countDisplay.textContent = tasbeehCount;
        localStorage.setItem('tasbeehCount', '0');
    });

    // --- 4. البوصلة الأساسية ---
    const compassBtn = document.getElementById('enableCompass');
    const needle = document.getElementById('needle');
    const statusText = document.getElementById('compassStatus');

    compassBtn?.addEventListener('click', async () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceOrientationEvent.requestPermission();
                if (permissionState === 'granted') {
                    startCompass();
                } else {
                    statusText.textContent = "تم رفض صلاحية البوصلة.";
                }
            } catch (error) {
                statusText.textContent = "خطأ في الصلاحيات.";
            }
        } else {
            startCompass();
        }
    });

    function startCompass() {
        compassBtn.style.display = 'none';
        statusText.textContent = "البوصلة تعمل.. حرك الجوال بشكل رقم 8 للمعايرة";
        
        window.addEventListener('deviceorientation', (event) => {
            let heading = event.webkitCompassHeading || Math.abs(event.alpha - 360);
            if(heading != null) {
                const qibla = parseFloat(localStorage.getItem('qiblaDirection') || '136'); // 136 للرياض تقريباً
                const angle = qibla - heading;
                if(needle) needle.style.transform = `translate(-50%, -100%) rotate(${angle}deg)`;
            }
        }, true);
    }

    // --- 5. زر الإصلاح الإجباري ---
    document.getElementById('hardResetBtn')?.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload(true);
    });

});
