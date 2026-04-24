// Rafiq Muslim v1.1.3 - تحديث القرآن الكبير
import { loadSurahList, checkLastRead, openPage, currentQuranPage } from './quran.js';
import { setQiblaFromCoords, loadStoredQibla, setupCompass } from './qibla.js';

const API_BASE='https://api.aladhan.com/v1';
const BDC_REVERSE='https://api-bdc.net/data/reverse-geocode-client';
export const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
export const LS = (k,v) => { try { if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); } catch(e) { return null; } };

let CFG=null, nextTimer=null; let loaded={adhkar:false, resources:false, learning:false, quran:false, asma:false};
let rawAdhkarData=null; export let showTashkeel=LS('tashkeel')!=='false'; 
let currentFontSize = parseFloat(LS('fontSize')); if(isNaN(currentFontSize)) currentFontSize = 1.5;

// 1. نظام التنبيهات المنبثقة (Toasts)
export function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--accent);color:var(--bg);padding:10px 20px;border-radius:20px;z-index:9999;font-size:1.2rem;box-shadow:0 4px 10px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.3s;pointer-events:none;font-weight:bold;';
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '1', 10);
    setTimeout(() => { 
        t.style.opacity = '0'; setTimeout(()=>t.remove(),300); 
    }, 2500);
}

const I18N = {
  ar: { app_name: "تهجد", date_label: "التاريخ", next_prayer: "الصلاة القادمة", city_label: "المدينة", nav_times: "أوقات الصلاة", nav_adhkar: "الأذكار", nav_quran: "القرآن", nav_tasbeeh: "تسبيح", nav_settings: "المزيد", Fajr: "الفجر", Sunrise: "الشروق", Dhuhr: "الظهر", Asr: "العصر", Maghrib: "المغرب", Isha: "العشاء", Duha: "الضحى", last_third: "الثلث الأخير", lang_label: "اللغة / Language", daily_table: "جدول مواعيد الصلاة اليومي", prayer_th: "الصلاة", start_th: "دخول", end_th: "خروج", qibla_angle: "زاوية القبلة:", qibla_btn: "اتجاه القبلة", daily_benefit: "فائدة اليوم", tasbeeh_next: "التالي", tasbeeh_counter: "العدّاد", tasbeeh_target: "الهدف", tasbeeh_btn: "سَبِّح", tasbeeh_reset: "تصفير", quran_title: "القرآن الكريم", tab_surah: "السور", tab_juz: "الأجزاء", tab_page: "الصفحات", back_btn: "← عودة", next_page: "التالية ←", prev_page: "→ السابقة", search_placeholder: "🔍 ابحث عن اسم السورة...", settings_title: "إعدادات التطبيق", extra_sections: "أقسام إضافية:", appearance: "المظهر والألوان:", reading_alerts: "القراءة والتنبيهات:", prayer_settings: "إعدادات أوقات الصلاة:", true_isha_title: "وقت العشاء الفعلي:", hijri_adj_title: "ضبط التاريخ الهجري:", install_title: "ثبت التطبيق على جهازك:", learning_title: "فوائد وتعلم", sources_title: "مصادر وروابط", reminders_title: "تذكيرات", update_msg: "تحديث جديد متوفر", update_btn: "تحديث", later_btn: "لاحقًا", locating: "جاري التحديد…", my_location: "موقعي", location_disabled: "لم يتم تفعيل الموقع، اختر مدينتك يدوياً.", now: "حان الوقت", time_passed: "منذ {m} د", tab_morning: "الصباح 🌅", tab_evening: "المساء 🌙", tab_sleep: "النوم 😴", tab_wakeup: "الاستيقاظ ☀️", tab_afterPrayer: "بعد الصلاة 📿", tab_home: "المنزل 🏠", tab_mosque: "المسجد 🕌", tab_worry: "الهم والحزن 💔", tab_travel: "السفر ✈️", tab_illness: "المرض 💊", tab_dua: "أدعية 🤲", tab_daily: "متفرقة 🌟", tab_friday: "الجمعة 🕌", btn_tashkeel: "التشكيل (بَ/ب)", btn_notify: "تنبيه الأذان 🔔", btn_audio_on: "صوت الأذان 🔊", btn_audio_off: "صوت الأذان 🔇", btn_font_inc: "تكبير الخط (A+)", btn_font_dec: "تصغير الخط (A-)", btn_qibla_sec: "🧭 القبلة", btn_learn_sec: "📚 فوائد وتعلم", btn_install: "📲 تثبيت تطبيق تهجد", continue_reading: "📖 متابعة القراءة", pager_prev: "السابق", pager_next: "التالي", pager_copy: "نسخ", pager_ref: "مرجع", pager_done: "تم", pager_source: "المصدر:", loading: "جاري التحميل...", manual_city: "— اختر مدينة يدوياً —" },
  en: { app_name: "Tahajjud", date_label: "Date", next_prayer: "Next Prayer", city_label: "City", nav_times: "Prayer Times", nav_adhkar: "Adhkar", nav_quran: "Quran", nav_tasbeeh: "Tasbeeh", nav_settings: "Settings", Fajr: "Fajr", Sunrise: "Sunrise", Dhuhr: "Dhuhr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha", Duha: "Duha", last_third: "Last Third", lang_label: "Language / اللغة", daily_table: "Daily Prayer Schedule", prayer_th: "Prayer", start_th: "Start", end_th: "End", qibla_angle: "Qibla Angle:", qibla_btn: "Qibla Direction", daily_benefit: "Daily Benefit", tasbeeh_next: "Next", tasbeeh_counter: "Counter", tasbeeh_target: "Target", tasbeeh_btn: "Tasbeeh", tasbeeh_reset: "Reset", quran_title: "Holy Quran", tab_surah: "Surahs", tab_juz: "Juz", tab_page: "Pages", back_btn: "← Back", next_page: "Next ←", prev_page: "→ Prev", search_placeholder: "🔍 Search Surah...", settings_title: "App Settings", extra_sections: "Extra Sections:", appearance: "Appearance & Colors:", reading_alerts: "Reading & Alerts:", prayer_settings: "Prayer Settings:", true_isha_title: "True Isha Time:", hijri_adj_title: "Hijri Date Adjustment:", install_title: "Install App:", learning_title: "Learning & Benefits", sources_title: "Sources & Links", reminders_title: "Reminders", update_msg: "New update available", update_btn: "Update", later_btn: "Later", locating: "Locating...", my_location: "My Location", location_disabled: "Location disabled, choose city manually.", now: "Now", time_passed: "{m}m ago", tab_morning: "Morning 🌅", tab_evening: "Evening 🌙", tab_sleep: "Sleep 😴", tab_wakeup: "Wakeup ☀️", tab_afterPrayer: "After Prayer 📿", tab_home: "Home 🏠", tab_mosque: "Mosque 🕌", tab_worry: "Worry 💔", tab_travel: "Travel ✈️", tab_illness: "Illness 💊", tab_dua: "Dua 🤲", tab_daily: "Daily 🌟", tab_friday: "Friday 🕌", btn_tashkeel: "Diacritics", btn_notify: "Adhan Alert 🔔", btn_audio_on: "Adhan Audio 🔊", btn_audio_off: "Adhan Audio 🔇", btn_font_inc: "Larger Font (A+)", btn_font_dec: "Smaller Font (A-)", btn_qibla_sec: "🧭 Qibla", btn_learn_sec: "📚 Learning", btn_install: "📲 Install App", continue_reading: "📖 Continue Reading", pager_prev: "Prev", pager_next: "Next", pager_copy: "Copy", pager_ref: "Ref", pager_done: "Done", pager_source: "Source:", loading: "Loading...", manual_city: "— Select City Manually —" },
  ur: { app_name: "تہجد", date_label: "تاریخ", next_prayer: "اگلی نماز", city_label: "شہر", nav_times: "اوقات نماز", nav_adhkar: "اذکار", nav_quran: "قرآن", nav_tasbeeh: "تسبیح", nav_settings: "مزید", Fajr: "فجر", Sunrise: "طلوع آفتاب", Dhuhr: "ظہر", Asr: "عصر", Maghrib: "مغرب", Isha: "عشاء", Duha: "چاشت", last_third: "آخری تہائی", lang_label: "زبان / Language", daily_table: "روزانہ نماز کا شیڈول", prayer_th: "نماز", start_th: "شروع", end_th: "ختم", qibla_angle: "زاویہ قبلہ:", qibla_btn: "سمت قبلہ", daily_benefit: "آج کا فائدہ", tasbeeh_next: "اگلا", tasbeeh_counter: "کاؤنٹر", tasbeeh_target: "ہدف", tasbeeh_btn: "تسبیح", tasbeeh_reset: "ری سیٹ", quran_title: "قرآن مجید", tab_surah: "سورتیں", tab_juz: "پارے", tab_page: "صفحات", back_btn: "← پیچھے", next_page: "اگلا ←", prev_page: "→ پچھلا", search_placeholder: "🔍 سورت تلاش کریں...", settings_title: "ایپ کی ترتیبات", extra_sections: "مزید حصے:", appearance: "ظاہری شکل و رنگ:", reading_alerts: "پڑھنا اور الرٹس:", prayer_settings: "نماز کی ترتیبات:", true_isha_title: "عشاء کا اصل وقت:", hijri_adj_title: "ہجری تاریخ کی ترتیب:", install_title: "ایپ انسٹال کریں:", learning_title: "فوائد اور سیکھنا", sources_title: "ذرائع اور لنکس", reminders_title: "یاد دہانیاں", update_msg: "نئی اپ ڈیٹ دستیاب ہے", update_btn: "اپ ڈیٹ", later_btn: "بعد میں", locating: "تلاش کر رہا ہے...", my_location: "میرا مقام", location_disabled: "مقام غیر فعال ہے۔", now: "وقت ہو گیا", time_passed: "{m} منٹ پہلے", tab_morning: "صبح 🌅", tab_evening: "شام 🌙", tab_sleep: "نیند 😴", tab_wakeup: "بیداری ☀️", tab_afterPrayer: "نماز کے بعد 📿", tab_home: "گھر 🏠", tab_mosque: "مسجد 🕌", tab_worry: "پریشانی 💔", tab_travel: "سفر ✈️", tab_illness: "بیماری 💊", tab_dua: "دعائیں 🤲", tab_daily: "روزانہ 🌟", tab_friday: "جمعہ 🕌", btn_tashkeel: "زیر زبر", btn_notify: "اذان الرٹ 🔔", btn_audio_on: "اذان آواز 🔊", btn_audio_off: "اذان آواز 🔇", btn_font_inc: "بڑا فونٹ (A+)", btn_font_dec: "چھوٹا فونٹ (A-)", btn_qibla_sec: "🧭 قبلہ", btn_learn_sec: "📚 سیکھنا", btn_install: "📲 ایپ انسٹال کریں", continue_reading: "📖 پڑھنا جاری رکھیں", pager_prev: "پچھلا", pager_next: "اگلا", pager_copy: "کاپی", pager_ref: "حوالہ", pager_done: "مکمل", pager_source: "ذریعہ:", loading: "لوڈ ہو رہا ہے...", manual_city: "— دستی شہر منتخب کریں —" },
  bn: { app_name: "তাহাজ্জুদ", date_label: "তারিখ", next_prayer: "পরবর্তী নামাজ", city_label: "শহর", nav_times: "নামাজের সময়", nav_adhkar: "জিকির", nav_quran: "কুরআন", nav_tasbeeh: "তাসবিহ", nav_settings: "সেটিংস", Fajr: "ফজর", Sunrise: "সূর্যোদয়", Dhuhr: "যোহর", Asr: "আসর", Maghrib: "মাগরিব", Isha: "এশা", Duha: "চাশত", last_third: "শেষ তৃতীয়াংশ", lang_label: "ভাষা / Language", daily_table: "দৈনিক নামাজের সময়সূচী", prayer_th: "নামাজ", start_th: "শুরু", end_th: "শেষ", qibla_angle: "কিবলার কোণ:", qibla_btn: "কিবলার দিক", daily_benefit: "আজকের উপকারিতা", tasbeeh_next: "পরবর্তী", tasbeeh_counter: "কাউন্টার", tasbeeh_target: "লক্ষ্য", tasbeeh_btn: "তাসবিহ", tasbeeh_reset: "রিসেট", quran_title: "পবিত্র কুরআন", tab_surah: "সূরা", tab_juz: "পারা", tab_page: "পৃষ্ঠা", back_btn: "← ফিরে যান", next_page: "পরবর্তী ←", prev_page: "→ পূর্ববর্তী", search_placeholder: "🔍 সূরা অনুসন্ধান...", settings_title: "অ্যাপ সেটিংস", extra_sections: "অতিরিক্ত বিভাগ:", appearance: "উপস্থিতি এবং রঙ:", reading_alerts: "পড়া এবং সতর্কতা:", prayer_settings: "নামাজের সেটিংস:", true_isha_title: "প্রকৃত এশার সময়:", hijri_adj_title: "হিজরি তারিখ সমন্বয়:", install_title: "অ্যাপ ইনস্টল করুন:", learning_title: "শিক্ষা ও উপকারিতা", sources_title: "উৎস এবং লিঙ্ক", reminders_title: "অনুস্মারক", update_msg: "নতুন আপডেট উপলব্ধ", update_btn: "আপডেট", later_btn: "পরে", locating: "অবস্থান নির্ণয়...", my_location: "আমার অবস্থান", location_disabled: "অবস্থান অক্ষম।", now: "এখন", time_passed: "{m} মি. আগে", tab_morning: "সকাল 🌅", tab_evening: "সন্ধ্যা 🌙", tab_sleep: "ঘুম 😴", tab_wakeup: "জাগরণ ☀️", tab_afterPrayer: "নামাজের পর 📿", tab_home: "বাড়ি 🏠", tab_mosque: "মসজিদ 🕌", tab_worry: "দুশ্চিন্তা 💔", tab_travel: "ভ্রমণ ✈️", tab_illness: "অসুস্থতা 💊", tab_dua: "দোয়া 🤲", tab_daily: "দৈনিক 🌟", tab_friday: "শুক্রবার 🕌", btn_tashkeel: "যের যবর", btn_notify: "আজান সতর্কতা 🔔", btn_audio_on: "আজানের শব্দ 🔊", btn_audio_off: "আজানের শব্দ 🔇", btn_font_inc: "বড় ফন্ট (A+)", btn_font_dec: "ছোট ফন্ট (A-)", btn_qibla_sec: "🧭 কিবলা", btn_learn_sec: "📚 শিক্ষা", btn_install: "📲 অ্যাপ ইনস্টল করুন", continue_reading: "📖 পড়া চালিয়ে যান", pager_prev: "পূর্ববর্তী", pager_next: "পরবর্তী", pager_copy: "কপি", pager_ref: "সূত্র", pager_done: "সম্পন্ন", pager_source: "সূত্র:", loading: "লোড হচ্ছে...", manual_city: "— ম্যানুয়ালি শহর নির্বাচন করুন —" },
  id: { app_name: "Tahajjud", date_label: "Tanggal", next_prayer: "Waktu Shalat", city_label: "Kota", nav_times: "Jadwal", nav_adhkar: "Dzikir", nav_quran: "Al-Qur'an", nav_tasbeeh: "Tasbih", nav_settings: "Pengaturan", Fajr: "Subuh", Sunrise: "Terbit", Dhuhr: "Dzuhur", Asr: "Ashar", Maghrib: "Maghrib", Isha: "Isya", Duha: "Dhuha", last_third: "Sepertiga Malam", lang_label: "Bahasa / Language", daily_table: "Jadwal Shalat Harian", prayer_th: "Shalat", start_th: "Mulai", end_th: "Akhir", qibla_angle: "Sudut Kiblat:", qibla_btn: "Arah Kiblat", daily_benefit: "Manfaat Hari Ini", tasbeeh_next: "Lanjut", tasbeeh_counter: "Penghitung", tasbeeh_target: "Target", tasbeeh_btn: "Tasbih", tasbeeh_reset: "Reset", quran_title: "Al-Qur'an Suci", tab_surah: "Surah", tab_juz: "Juz", tab_page: "Halaman", back_btn: "← Kembali", next_page: "Lanjut ←", prev_page: "→ Prev", search_placeholder: "🔍 Cari Surah...", settings_title: "Pengaturan Aplikasi", extra_sections: "Bagian Tambahan:", appearance: "Tampilan & Warna:", reading_alerts: "Membaca & Peringatan:", prayer_settings: "Pengaturan Shalat:", true_isha_title: "Waktu Isya Sebenarnya:", hijri_adj_title: "Penyesuaian Hijriah:", install_title: "Instal Aplikasi:", learning_title: "Pembelajaran & Manfaat", sources_title: "Sumber & Tautan", reminders_title: "Pengingat", update_msg: "Pembaruan tersedia", update_btn: "Perbarui", later_btn: "Nanti", locating: "Mencari lokasi...", my_location: "Lokasi Saya", location_disabled: "Lokasi dinonaktifkan.", now: "Sekarang", time_passed: "{m}m yg lalu", tab_morning: "Pagi 🌅", tab_evening: "Malam 🌙", tab_sleep: "Tidur 😴", tab_wakeup: "Bangun ☀️", tab_afterPrayer: "Setelah Shalat 📿", tab_home: "Rumah 🏠", tab_mosque: "Masjid 🕌", tab_worry: "Kekhawatiran 💔", tab_travel: "Bepergian ✈️", tab_illness: "Sakit 💊", tab_dua: "Doa 🤲", tab_daily: "Harian 🌟", tab_friday: "Jumat 🕌", btn_tashkeel: "Harakat", btn_notify: "Notifikasi Adzan 🔔", btn_audio_on: "Suara Adzan 🔊", btn_audio_off: "Suara Adzan 🔇", btn_font_inc: "Perbesar Font (A+)", btn_font_dec: "Perkecil Font (A-)", btn_qibla_sec: "🧭 Kiblat", btn_learn_sec: "📚 Belajar", btn_install: "📲 Instal Aplikasi", continue_reading: "📖 Lanjut Membaca", pager_prev: "Seblm", pager_next: "Lanjut", pager_copy: "Salin", pager_ref: "Ref", pager_done: "Selesai", pager_source: "Sumber:", loading: "Memuat...", manual_city: "— Pilih Kota Manual —" },
  tr: { app_name: "Teheccüd", date_label: "Tarih", next_prayer: "Sonraki Namaz", city_label: "Şehir", nav_times: "Vakitler", nav_adhkar: "Zikirler", nav_quran: "Kuran", nav_tasbeeh: "Tesbih", nav_settings: "Ayarlar", Fajr: "İmsak", Sunrise: "Güneş", Dhuhr: "Öğle", Asr: "İkindi", Maghrib: "Akşam", Isha: "Yatsı", Duha: "Kuşluk", last_third: "Son Üçte Bir", lang_label: "Dil / Language", daily_table: "Günlük Namaz Vakitleri", prayer_th: "Namaz", start_th: "Giriş", end_th: "Çıkış", qibla_angle: "Kıble Açısı:", qibla_btn: "Kıble Yönü", daily_benefit: "Günün Faydası", tasbeeh_next: "İleri", tasbeeh_counter: "Sayaç", tasbeeh_target: "Hedef", tasbeeh_btn: "Tesbih", tasbeeh_reset: "Sıfırla", quran_title: "Kur'an-ı Kerim", tab_surah: "Sureler", tab_juz: "Cüz", tab_page: "Sayfalar", back_btn: "← Geri", next_page: "İleri ←", prev_page: "→ Önceki", search_placeholder: "🔍 Sure Ara...", settings_title: "Uygulama Ayarları", extra_sections: "Ek Bölümler:", appearance: "Görünüm ve Renkler:", reading_alerts: "Okuma ve Uyarılar:", prayer_settings: "Namaz Ayarları:", true_isha_title: "Gerçek Yatsı:", hijri_adj_title: "Hicri Tarih Ayarı:", install_title: "Uygulamayı Yükle:", learning_title: "Öğrenim ve Faydalar", sources_title: "Kaynaklar ve Bağlantılar", reminders_title: "Hatırlatmalar", update_msg: "Güncelleme mevcut", update_btn: "Güncelle", later_btn: "Sonra", locating: "Konum bulunuyor...", my_location: "Konumum", location_disabled: "Konum kapalı.", now: "Şimdi", time_passed: "{m} dk önce", tab_morning: "Sabah 🌅", tab_evening: "Akşam 🌙", tab_sleep: "Uyku 😴", tab_wakeup: "Uyanış ☀️", tab_afterPrayer: "Namaz Sonrası 📿", tab_home: "Ev 🏠", tab_mosque: "Cami 🕌", tab_worry: "Endişe 💔", tab_travel: "Seyahat ✈️", tab_illness: "Hastalık 💊", tab_dua: "Dua 🤲", tab_daily: "Günlük 🌟", tab_friday: "Cuma 🕌", btn_tashkeel: "Harekeler", btn_notify: "Ezan Bildirimi 🔔", btn_audio_on: "Ezan Sesi 🔊", btn_audio_off: "Ezan Sesi 🔇", btn_font_inc: "Yazıyı Büyüt (A+)", btn_font_dec: "Yazıyı Küçült (A-)", btn_qibla_sec: "🧭 Kıble", btn_learn_sec: "📚 Öğrenim", btn_install: "📲 Uygulamayı Yükle", continue_reading: "📖 Okumaya Devam Et", pager_prev: "Önceki", pager_next: "Sonraki", pager_copy: "Kopyala", pager_ref: "Kaynak", pager_done: "Tamam", pager_source: "Kaynak:", loading: "Yükleniyor...", manual_city: "— Şehri Manuel Seçin —" },
  fa: { app_name: "تهجد", date_label: "تاریخ", next_prayer: "نماز بعدی", city_label: "شهر", nav_times: "اوقات شرعی", nav_adhkar: "اذکار", nav_quran: "قرآن", nav_tasbeeh: "تسبیح", nav_settings: "بیشتر", Fajr: "صبح", Sunrise: "طلوع", Dhuhr: "ظهر", Asr: "عصر", Maghrib: "مغرب", Isha: "عشاء", Duha: "چاشت", last_third: "ثلث آخر", lang_label: "زبان / Language", daily_table: "جدول روزانه اوقات شرعی", prayer_th: "نماز", start_th: "شروع", end_th: "پایان", qibla_angle: "زاویه قبله:", qibla_btn: "جهت قبله", daily_benefit: "فایده روز", tasbeeh_next: "بعدی", tasbeeh_counter: "شمارشگر", tasbeeh_target: "هدف", tasbeeh_btn: "تسبیح", tasbeeh_reset: "بازنشانی", quran_title: "قرآن کریم", tab_surah: "سوره‌ها", tab_juz: "جزءها", tab_page: "صفحات", back_btn: "← بازگشت", next_page: "بعدی ←", prev_page: "→ قبلی", search_placeholder: "🔍 جستجوی سوره...", settings_title: "تنظیمات برنامه", extra_sections: "بخش‌های بیشتر:", appearance: "ظاهر و رنگ‌ها:", reading_alerts: "خواندن و هشدارها:", prayer_settings: "تنظیمات نماز:", true_isha_title: "وقت واقعی عشاء:", hijri_adj_title: "تنظیم تاریخ هجری:", install_title: "نصب برنامه:", learning_title: "یادگیری و فواید", sources_title: "منابع و پیوندها", reminders_title: "یادآوری‌ها", update_msg: "بروزرسانی جدید", update_btn: "بروزرسانی", later_btn: "بعداً", locating: "مکان‌یابی...", my_location: "مکان من", location_disabled: "مکان‌یابی غیرفعال است.", now: "اکنون", time_passed: "{m} دقیقه پیش", tab_morning: "صبح 🌅", tab_evening: "شام 🌙", tab_sleep: "خواب 😴", tab_wakeup: "بیدار شدن ☀️", tab_afterPrayer: "بعد از نماز 📿", tab_home: "خانه 🏠", tab_mosque: "مسجد 🕌", tab_worry: "نگرانی 💔", tab_travel: "سفر ✈️", tab_illness: "بیماری 💊", tab_dua: "دعا 🤲", tab_daily: "روزانه 🌟", tab_friday: "جمعه 🕌", btn_tashkeel: "اعراب‌گذاری", btn_notify: "هشدار اذان 🔔", btn_audio_on: "صدای اذان 🔊", btn_audio_off: "صدای اذان 🔇", btn_font_inc: "بزرگ‌نمایی (A+)", btn_font_dec: "کوچک‌نمایی (A-)", btn_qibla_sec: "🧭 قبله", btn_learn_sec: "📚 یادگیری", btn_install: "📲 نصب برنامه", continue_reading: "📖 ادامه خواندن", pager_prev: "قبلی", pager_next: "بعدی", pager_copy: "کپی", pager_ref: "منبع", pager_done: "انجام شد", pager_source: "منبع:", loading: "در حال بارگذاری...", manual_city: "— انتخاب دستی شهر —" },
  fr: { app_name: "Tahajjud", date_label: "Date", next_prayer: "Prochaine Prière", city_label: "Ville", nav_times: "Horaires", nav_adhkar: "Adhkar", nav_quran: "Coran", nav_tasbeeh: "Tasbih", nav_settings: "Paramètres", Fajr: "Fajr", Sunrise: "Chourouk", Dhuhr: "Dhohr", Asr: "Asr", Maghrib: "Maghrib", Isha: "Isha", Duha: "Duha", last_third: "Dernier Tiers", lang_label: "Langue / Language", daily_table: "Horaires de Prière", prayer_th: "Prière", start_th: "Début", end_th: "Fin", qibla_angle: "Angle Qibla:", qibla_btn: "Direction Qibla", daily_benefit: "Bénéfice du Jour", tasbeeh_next: "Suivant", tasbeeh_counter: "Compteur", tasbeeh_target: "Cible", tasbeeh_btn: "Tasbih", tasbeeh_reset: "Réinitialiser", quran_title: "Saint Coran", tab_surah: "Sourates", tab_juz: "Juz", tab_page: "Pages", back_btn: "← Retour", next_page: "Suivant ←", prev_page: "→ Précédent", search_placeholder: "🔍 Rechercher...", settings_title: "Paramètres", extra_sections: "Sections Extra:", appearance: "Apparence & Couleurs:", reading_alerts: "Lecture & Alertes:", prayer_settings: "Paramètres Prière:", true_isha_title: "Heure Réelle Isha:", hijri_adj_title: "Ajustement Hijri:", install_title: "Installer l'App:", learning_title: "Apprentissage", sources_title: "Sources & Liens", reminders_title: "Rappels", update_msg: "Nouvelle mise à jour", update_btn: "Mettre à jour", later_btn: "Plus tard", locating: "Localisation...", my_location: "Ma Position", location_disabled: "Localisation désactivée.", now: "Maintenant", time_passed: "Il y a {m}m", tab_morning: "Matin 🌅", tab_evening: "Soir 🌙", tab_sleep: "Sommeil 😴", tab_wakeup: "Réveil ☀️", tab_afterPrayer: "Après Prière 📿", tab_home: "Maison 🏠", tab_mosque: "Mosquée 🕌", tab_worry: "Souci 💔", tab_travel: "Voyage ✈️", tab_illness: "Maladie 💊", tab_dua: "Dua 🤲", tab_daily: "Quotidien 🌟", tab_friday: "Vendredi 🕌", btn_tashkeel: "Diacritiques", btn_notify: "Alerte Adhan 🔔", btn_audio_on: "Audio Adhan 🔊", btn_audio_off: "Audio Adhan 🔇", btn_font_inc: "Agrandir (A+)", btn_font_dec: "Réduire (A-)", btn_qibla_sec: "🧭 Qibla", btn_learn_sec: "📚 Apprentissage", btn_install: "📲 Installer", continue_reading: "📖 Continuer", pager_prev: "Préc.", pager_next: "Suiv.", pager_copy: "Copier", pager_ref: "Réf", pager_done: "Fait", pager_source: "Source:", loading: "Chargement...", manual_city: "— Choisir Ville Manuellement —" }
};

const NEW_I18N = {
  ar: { asma_title: "أسماء الله الحسنى", zakat_title: "حاسبة الزكاة", missed_title: "قضاء الصلوات", btn_calc: "احسب الزكاة", zakat_result: "مقدار الزكاة الواجبة:", btn_format_24: "تنسيق 24 ساعة 🕒", btn_format_12: "تنسيق 12 ساعة 🕒" },
  en: { asma_title: "99 Names of Allah", zakat_title: "Zakat Calculator", missed_title: "Missed Prayers", btn_calc: "Calculate", zakat_result: "Zakat Due:", btn_format_24: "24-Hour Format 🕒", btn_format_12: "12-Hour Format 🕒" }
};
Object.keys(I18N).forEach(lang => { Object.assign(I18N[lang], NEW_I18N[lang] || NEW_I18N['ar']); });

export let currentLang = LS('lang') || 'ar';
export function t(key) { return I18N[currentLang][key] || I18N['ar'][key] || key; }
function applyLang() {
  document.documentElement.lang = currentLang; document.documentElement.dir = ['ar', 'ur', 'fa'].includes(currentLang) ? 'rtl' : 'ltr';
  qsa('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if(I18N[currentLang][k]) el.textContent = I18N[currentLang][k]; });
  qsa('[data-i18n-placeholder]').forEach(el => { const k = el.getAttribute('data-i18n-placeholder'); if(I18N[currentLang][k]) el.setAttribute('placeholder', I18N[currentLang][k]); });
  qsa('[data-i18n-title]').forEach(el => { const k = el.getAttribute('data-i18n-title'); if(I18N[currentLang][k]) { el.setAttribute('title', I18N[currentLang][k]); el.setAttribute('aria-label', I18N[currentLang][k]); } });
  const navs = {times: 'nav_times', adhkar: 'nav_adhkar', quran: 'nav_quran', tasbeeh: 'nav_tasbeeh', settings: 'nav_settings'};
  qsa('.bottom-nav button').forEach(b => { const k = navs[b.dataset.target]; if(k) { b.title = t(k); b.setAttribute('aria-label', t(k)); } });
  
  // تحديث الأزرار الديناميكية والنصوص البرمجية
  const btnTashkeel = qs('#toggleTashkeel'); if(btnTashkeel) btnTashkeel.textContent = t('btn_tashkeel');
  const btnAudio = qs('#btnAudioAdhan'); if(btnAudio) { const isOn = LS('audioAdhan') === 'true'; btnAudio.textContent = t(isOn ? 'btn_audio_on' : 'btn_audio_off'); }
  if(loaded.adhkar && rawAdhkarData) { const activeBtn = qs('#adhkarPills button.active'); if(activeBtn) renderDhikrList(qs('#adhkarContainer'), rawAdhkarData[activeBtn.dataset.key]||[], activeBtn.dataset.key); }
  checkLastRead();
}

const TASBEEH_PHRASES=[{"name": "سُبْحَانَ اللَّهِ", "target": 33}, {"name": "الْحَمْدُ لِلَّهِ", "target": 33}, {"name": "اللَّهُ أَكْبَرُ", "target": 34}, {"name": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", "target": 100}, {"name": "لَا إِلَهَ إِلَّا اللَّهُ", "target": 100}, {"name": "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", "target": 100}, {"name": "أَسْتَغْفِرُ اللَّهَ", "target": 100}];

export function setText(id,t){const e=document.getElementById(id); if(e) e.textContent=t;}
function isoToDate(i){return new Date(i)}
function dateToApi(d){return String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear()}
function formatTime12h(d){const is24=LS('timeFormat24')==='true';try{return new Intl.DateTimeFormat(currentLang,{hour:'numeric',minute:'2-digit',hour12:!is24}).format(d)}catch(e){let h=d.getHours(),m=String(d.getMinutes()).padStart(2,'0');if(is24){return `${String(h).padStart(2,'0')}:${m}`;}else{const suf=h>=12?(['ar','ur','fa'].includes(currentLang)?'م':'PM'):(['ar','ur','fa'].includes(currentLang)?'ص':'AM');h=h%12||12;return `${h}:${m} ${suf}`;}}}

async function fetchJSON(url, defaultData) {
    try { const res = await fetch(url); if (!res.ok) throw new Error(); return await res.json(); } 
    catch(e) { return defaultData; }
}

function setupTrueIshaToggle() {
  const btn = qs('#btnToggleTrueIsha');
  const container = qs('#trueIshaContainer');
  const adhanLabel = qs('#ishaAdhanLabel');
  
  const updateUI = () => {
    const isVisible = LS('showTrueIsha') === 'true';
    // إظهار أو إخفاء الحاويات الجديدة
    if(container) container.style.display = isVisible ? 'flex' : 'none';
    if(adhanLabel) adhanLabel.style.display = isVisible ? 'inline' : 'none';
    
    if(btn) {
      btn.textContent = isVisible ? 'إخفاء العشاء الفعلي' : 'إظهار العشاء الفعلي';
      btn.style.borderColor = isVisible ? 'var(--accent)' : 'var(--border)';
    }
  };

  btn?.addEventListener('click', () => {
    const currentState = LS('showTrueIsha') === 'true';
    LS('showTrueIsha', String(!currentState));
    updateUI();
    haptic(10);
  });

  updateUI();
}

function setupTimeFormatToggle() {
  let btn = qs('#btnTimeFormat');
  if (!btn) {
    const trueIshaBtn = qs('#btnToggleTrueIsha');
    if(trueIshaBtn && trueIshaBtn.parentElement) {
      btn = document.createElement('button'); btn.id = 'btnTimeFormat'; btn.className = 'btn secondary';
      trueIshaBtn.parentElement.appendChild(btn);
    }
  }
  if(!btn) return;
  
  const updateBtn = () => { const is24 = LS('timeFormat24') === 'true'; btn.textContent = t(is24 ? 'btn_format_12' : 'btn_format_24'); btn.style.borderColor = is24 ? 'var(--accent)' : 'var(--border)'; btn.style.color = is24 ? 'var(--accent)' : 'var(--fg)'; };
  updateBtn();
  btn.addEventListener('click', () => {
    const is24 = LS('timeFormat24') === 'true'; LS('timeFormat24', String(!is24));
    updateBtn(); haptic(10); loadPrayerTimes(false);
  });
}

function renderHijri(){
  try{
    const d = new Date(); const adj = parseInt(LS('hijriAdj')) || 0; d.setDate(d.getDate() + adj);
    const loc = currentLang === 'ar' ? 'ar-SA-u-ca-islamic' : currentLang + '-u-ca-islamic';
    const f=new Intl.DateTimeFormat(loc,{weekday: 'long', day:'numeric',month:'long',year:'numeric'}); 
    setText('hijri',f.format(d));
    const parts = f.formatToParts(d); const dayNum = parseInt(parts.find(p => p.type === 'day')?.value); 
    const physicalWeekday = new Date().getDay(); // الاعتماد على اليوم الفعلي للتذكير الأسبوعي لتجنب تأثير إزاحة الهجري
    let msg = '';
    if (dayNum === 12 || dayNum === 13 || dayNum === 14) msg = 'غداً من الأيام البيض، تذكير بالصيام 🌙';
    if (physicalWeekday === 0) msg = 'غداً الإثنين، تذكير بالصيام 🌙';
    if (physicalWeekday === 3) msg = 'غداً الخميس، تذكير بالصيام 🌙';
    // 7. وميض التذكير بالصيام
    const el = qs('#fastingReminder'); if(el) { el.textContent = msg; el.style.textShadow = msg ? '0 0 10px var(--accent)' : 'none'; el.style.transition = 'opacity 1s'; if(msg && !el.dataset.pulsing) { el.dataset.pulsing = true; setInterval(() => el.style.opacity = el.style.opacity === '0.6' ? '1' : '0.6', 1000); } }
  }catch(e){setText('hijri','—')}
}

function translatePrayer(k){return t(k);}
function computeDuha(s,d){return {start:new Date(isoToDate(s).getTime()+CFG.duha.startOffsetAfterSunriseMin*60000), end:new Date(isoToDate(d).getTime()-CFG.duha.endOffsetBeforeDhuhrMin*60000)}}
function computeLastThird(m,f){const magh=isoToDate(m), fajr=isoToDate(f); let night=fajr-magh; if(night<=0) night+=86400000; const third=night/3; return {start:new Date(fajr.getTime()-third), end:fajr}}

async function fetchTimingsByCoords(date,lat,lon, methodOverride){const m = methodOverride !== undefined ? methodOverride : CFG.calculation.method; const ds=dateToApi(date); let u=`${API_BASE}/timings/${ds}?latitude=${lat}&longitude=${lon}&iso8601=true`; if(m !== 'auto') u+=`&method=${m}`; if(CFG.calculation.school !== 'auto') u+=`&school=${CFG.calculation.school}`; const r=await fetch(u); const j=await r.json(); if(j.code!==200) throw new Error(); return j.data;}
async function fetchTimingsByCity(date,city,country, methodOverride){const m = methodOverride !== undefined ? methodOverride : CFG.calculation.method; const ds=dateToApi(date); let u=`${API_BASE}/timingsByCity/${ds}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&iso8601=true`; if(m !== 'auto') u+=`&method=${m}`; if(CFG.calculation.school !== 'auto') u+=`&school=${CFG.calculation.school}`; const r=await fetch(u); const j=await r.json(); if(j.code!==200) throw new Error(); return j.data;}

function initScheme() {
  const savedScheme = LS('scheme') || 'colorful'; document.documentElement.setAttribute('data-scheme', savedScheme);
  document.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', (e) => { const val = e.target.getAttribute('data-val'); document.documentElement.setAttribute('data-scheme', val); LS('scheme', val); });
  });
}

function applyFontSize() { document.body.style.fontSize = currentFontSize + 'rem'; LS('fontSize', currentFontSize); }

function checkNotify(prayerName) { 
  if (window.Notification && Notification.permission === 'granted') { 
    new Notification('تهجد', { 
      body: (currentLang === 'ar' ? 'حان الآن موعد صلاة ' : 'It is now time for ') + prayerName, 
      icon: './assets/img/icon-192.png' 
    }); 
  } 
  if (LS('audioAdhan') === 'true') {
    const audio = new Audio('https://server11.mp3quran.net/adhan/Alafasy.mp3');
    audio.play().catch(e => console.log('تعذر تشغيل الصوت:', e));
  }
}
function initUI() {
  qs('#btnTextInc')?.addEventListener('click', () => { currentFontSize += 0.1; applyFontSize(); });
  qs('#btnTextDec')?.addEventListener('click', () => { currentFontSize = Math.max(1, currentFontSize - 0.1); applyFontSize(); });
  
  const btnTashkeel = qs('#toggleTashkeel');
  if(btnTashkeel) {
    const updateTashkeelBtn = () => { btnTashkeel.textContent = t('btn_tashkeel'); btnTashkeel.style.borderColor = showTashkeel ? 'var(--accent)' : 'var(--border)'; btnTashkeel.style.color = showTashkeel ? 'var(--accent)' : 'var(--fg)'; };
    updateTashkeelBtn();
    btnTashkeel.addEventListener('click', () => { 
      showTashkeel = !showTashkeel; LS('tashkeel', showTashkeel); updateTashkeelBtn(); haptic(10);
      if(loaded.adhkar && rawAdhkarData) { const activeBtn = qs('#adhkarPills button.active'); if(activeBtn) renderDhikrList(qs('#adhkarContainer'), rawAdhkarData[activeBtn.dataset.key]||[], activeBtn.dataset.key); }
      if(loaded.quran && qs('#quranReader').style.display === 'block') { openPage(currentQuranPage); } 
    });
  }

  qs('#btnNotify')?.addEventListener('click', () => { if(!('Notification' in window)) return alert('متصفحك لا يدعم التنبيهات'); Notification.requestPermission().then(p => { if(p==='granted') alert('تم تفعيل تنبيهات الأذان بنجاح ✓'); }); });
  
  const langSel = qs('#langSelect');
  if(langSel) {
    langSel.value = currentLang;
    langSel.addEventListener('change', (e) => {
      currentLang = e.target.value; LS('lang', currentLang);
      applyLang(); renderHijri(); loadPrayerTimes(false); haptic(10);
    });
  }

  const btnAudio = qs('#btnAudioAdhan');
  if(btnAudio) {
    const updateAudioBtn = () => { const isOn = LS('audioAdhan') === 'true'; btnAudio.textContent = t(isOn ? 'btn_audio_on' : 'btn_audio_off'); btnAudio.style.borderColor = isOn ? 'var(--accent)' : 'var(--border)'; };
    updateAudioBtn();
    btnAudio.addEventListener('click', () => { 
      const isOn = LS('audioAdhan') === 'true'; LS('audioAdhan', String(!isOn)); updateAudioBtn(); haptic(10); 
      // تجربة الصوت لثانية واحدة لتخطي قيود المتصفح التي تمنع التشغيل التلقائي للصوت
      if(!isOn) { const a = new Audio('https://server11.mp3quran.net/adhan/Alafasy.mp3'); a.volume = 0.1; a.play().catch(()=>{}); setTimeout(()=>a.pause(), 1000); }
    });
  }

  let hijriAdj = parseInt(LS('hijriAdj')) || 0; const hSel = qs('#hijriAdjSelect');
  if(hSel){ hSel.value = String(hijriAdj); hSel.addEventListener('change', (e) => { LS('hijriAdj', parseInt(e.target.value)); renderHijri(); }); }
  
  const methodSel = qs('#calcMethodSelect');
  if(methodSel) {
    methodSel.value = LS('calcMethod') || 'auto';
    methodSel.addEventListener('change', (e) => { LS('calcMethod', e.target.value); CFG.calculation.method = e.target.value; loadPrayerTimes(false); haptic(10); });
  }
  
  const schoolSel = qs('#calcSchoolSelect');
  if(schoolSel) {
    schoolSel.value = LS('calcSchool') || 'auto';
    schoolSel.addEventListener('change', (e) => { LS('calcSchool', e.target.value); CFG.calculation.school = e.target.value; loadPrayerTimes(false); haptic(10); });
  }

  applyFontSize();
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    const header = qs('header');
    const bottomNav = qs('.bottom-nav');
    const readerHeader = qs('#readerHeader');
    if(!header) return;
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    if (Math.abs(delta) < 8) return; // تجاهل التمرير البسيط جداً لمنع الارتجاج
    if (delta > 0 && currentScrollY > 70) {
      header.classList.add('header-hidden'); // إخفاء عند النزول
      if(bottomNav) bottomNav.classList.add('nav-hidden');
      if(readerHeader) readerHeader.classList.add('header-hidden');
    } else if (delta < 0) {
      header.classList.remove('header-hidden'); // إظهار عند الصعود
      if(bottomNav) bottomNav.classList.remove('nav-hidden');
      if(readerHeader) readerHeader.classList.remove('header-hidden');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });
}

// تحديث دالة showSection لتصبح عالمية وتدعم تحميل البيانات
async function showSection(id) {
  // 1. تحديث أزرار القائمة السفلية
  qsa('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.target === id));
  
  // 2. تحديث الأقسام الظاهرة
  qsa('.section').forEach(s => s.classList.toggle('active', s.id === id));

  // 3. تحميل البيانات إذا لزم الأمر (خاص بالقرآن والأذكار والتعلم)
  if (id === 'quran' && !loaded.quran) { loaded.quran = true; loadSurahList(); }
  if (id === 'adhkar' && !loaded.adhkar) { 
    loaded.adhkar = true; 
    await Promise.all([loadAdhkar(), loadDailyBenefit()]); 
  }
  if (id === 'learning' && !loaded.learning) { 
    loaded.learning = true; 
    await Promise.all([loadLearning(), loadResources(), loadDailyBenefit()]); 
  }
  if (id === 'asma' && !loaded.asma) { loaded.asma = true; loadAsmaUlHusna(); }

  // 4. التحكم في ظهور الشريط العلوي (يظهر فقط في أوقات الصلاة)
  const topCard = document.getElementById('topKpiCard');
  if (topCard) {
    topCard.style.display = (id === 'times') ? 'block' : 'none';
  }

  // 5. العودة لأعلى الصفحة بسلاسة
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// جعل الدالة متاحة لـ HTML (خاص بنظام الـ Module)
window.showSection = showSection;

// تبسيط دالة initNav
function initNav() {
  qsa('.bottom-nav button').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.target));
  });
}

function initCityList(){
  const cities=[{label:'الرياض',city:'Riyadh',country:'SA'},{label:'مكة المكرمة',city:'Makkah',country:'SA'},{label:'المدينة المنورة',city:'Al Madinah al Munawwarah',country:'SA'},{label:'جدة',city:'Jeddah',country:'SA'},{label:'الدمام',city:'Dammam',country:'SA'},{label:'الطائف',city:'Taif',country:'SA'},{label:'أبها',city:'Abha',country:'SA'},{label:'تبوك',city:'Tabuk',country:'SA'}]; 
  const sel=qs('#citySelect'); if(!sel) return; 
  cities.forEach(c=>{const o=document.createElement('option'); o.value=JSON.stringify(c); o.textContent=c.label; sel.appendChild(o);}); 
  const saved=LS('cityFallback'); if(saved) sel.value=saved; 
  sel.addEventListener('change',()=>{LS('cityFallback',sel.value); updateCityKPIFromSelect(); loadPrayerTimes(true);}); updateCityKPIFromSelect();
}

function getCityFallback(){const v=LS('cityFallback'); if(v) try{return JSON.parse(v)}catch(e){} return CFG.defaultCity;}
function updateCityKPI(t){setText('cityDisplay',t||'—')}
function updateCityKPIFromSelect(){const sel=qs('#citySelect'); if(sel&&sel.value) try{const o=JSON.parse(sel.value); updateCityKPI(o.label||o.city)}catch(e){} else {const c=getCityFallback(); updateCityKPI(c.label||c.city||'—')}}

function cleanCityName(name) {
  if (!name) return name;
  return name.replace(/^(منطقة|محافظة|ولاية|إمارة|مدينة)\s+/g, '').replace(/\s+(Region|Province|Governorate|City|Municipality|State)$/gi, '').trim();
}

async function reverseGeocodeCity(lat,lon) {
  const key = `rg2:${lat.toFixed(3)},${lon.toFixed(3)}:${currentLang}`;
  const cached = LS(key);
  if(cached) try { return JSON.parse(cached); } catch(e){}
  
  try {
    const rOSM = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${currentLang}`);
    const jOSM = await rOSM.json();
    if(jOSM && jOSM.address) {
      let c = jOSM.address.city || jOSM.address.town || jOSM.address.village || jOSM.address.suburb || jOSM.address.county || jOSM.address.state;
      if(c) { const out = {city: cleanCityName(c)}; LS(key, JSON.stringify(out)); return out; }
    }
  } catch(e) {}
  
  const u = `${BDC_REVERSE}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=${currentLang}`;
  const r = await fetch(u); const j = await r.json();
  let c2 = j.city || j.locality || j.principalSubdivision || null;
  const out = {city: cleanCityName(c2)};
  LS(key, JSON.stringify(out)); return out;
}

function renderNextPrayer(T,fajrTomorrowISO){
  const order=['Fajr','Dhuhr','Asr','Maghrib','Isha']; 
  const now=new Date(); 
  let nextName=null, time=null, currName='Isha', currTime=null; 

  // البحث عن الصلاة القادمة والسابقة
  for(let i=0; i<order.length; i++){
    const k = order[i]; 
    const d = isoToDate(T[k]); 
    if(d > now){
      nextName=k; time=d; 
      // الصلاة الحالية هي التي تسبق القادمة في المصفوفة
      currName = i === 0 ? 'Isha' : order[i-1];
        currTime = i === 0 ? new Date(isoToDate(T['Isha']).getTime() - 86400000) : isoToDate(T[order[i-1]]); // تم التعديل: طرح 24 ساعة لجلب عشاء الأمس بدقة
      break;
    }
  } 

  if(!nextName){nextName='Fajr'; time=isoToDate(fajrTomorrowISO); currName='Isha'; currTime=isoToDate(T['Isha']);} 
  
  setText('nextPrayerName',translatePrayer(nextName)); 
  setText('nextPrayerTime',formatTime12h(time)); 

  if(nextTimer) clearInterval(nextTimer); 
  nextTimer=setInterval(()=>{
    const nowLoop = new Date();
    const diffNext = time - nowLoop; 
    const diffPrev = nowLoop - currTime; // الوقت المنقضي منذ الصلاة الحالية
    
    // إذا مر أقل من 35 دقيقة على الصلاة الحالية (35 * 60 * 1000)
    if(diffPrev > 0 && diffPrev < 2100000) {
      const minsPassed = Math.floor(diffPrev / 60000);
      setText('nextCountdown', `${translatePrayer(currName)}: ${t('time_passed').replace('{m}', minsPassed)}`);
    } else {
      // العداد التنازلي المعتاد للصلاة القادمة
      if(diffNext <= 0){
        setText('nextCountdown', t('now')); 
        checkNotify(translatePrayer(nextName));
        const pBar = qs('#prayerProgressBar'); if(pBar) pBar.style.width = '100%';
        clearInterval(nextTimer); 
        setTimeout(()=>loadPrayerTimes(), 60000); 
        return;
      } 
      const h=Math.floor(diffNext/3600000), m=Math.floor((diffNext%3600000)/60000), s=Math.floor((diffNext%60000)/1000); 
      setText('nextCountdown', h > 0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      
      // 3. شريط تقدم ذكي للصلوات
      const totalDiff = time - currTime;
      let progPct = Math.max(0, Math.min(100, (diffPrev / totalDiff) * 100));
      let progEl = qs('#prayerProgressBar');
      if(!progEl) { progEl = document.createElement('div'); progEl.id = 'prayerProgressBar'; progEl.style.cssText = 'height:4px;background:var(--accent);width:0%;transition:width 1s linear;border-radius:2px;margin-top:8px;opacity:0.8;'; const container = qs('#nextCountdown')?.parentElement; if(container) container.appendChild(progEl); }
      progEl.style.width = progPct + '%';
    }
  },1000);
} 

function shiftTimingsToDate(timingsObj, targetDate) {
  const out = {};
  const ymd = targetDate.getFullYear() + '-' + String(targetDate.getMonth()+1).padStart(2,'0') + '-' + String(targetDate.getDate()).padStart(2,'0');
  for(let key in timingsObj) {
    const val = timingsObj[key];
    // تحديث تواريخ الأوقات المحفوظة لتتطابق مع اليوم الحالي لكي لا يتعطل العداد
    if(typeof val === 'string' && val.includes('T') && val.length >= 19) {
       out[key] = ymd + val.substring(10);
    } else {
       out[key] = val;
    }
  }
  return out;
}

async function loadPrayerTimes(forceCity=false){
  setText('ptStatus',''); setText('ptMeta',''); 
  const controls = qs('#locationControls');
  const today=new Date(), tomorrow=new Date(Date.now()+86400000), c=getCityFallback(); 

  const renderTimes = (T, TT, T_True, save=true) => {
    ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>{ const el = qs('#t_'+k.toLowerCase()+'_s'); if(el) el.textContent = formatTime12h(isoToDate(T[k])); }); 
    const trueIshaTime = isoToDate(T_True.Isha); const elTrueIsha = qs('#t_isha_true_s'); if(elTrueIsha) elTrueIsha.textContent = formatTime12h(trueIshaTime);
    setText('t_fajr_e', formatTime12h(isoToDate(T.Sunrise))); setText('t_dhuhr_e', formatTime12h(isoToDate(T.Asr)));
    setText('t_asr_e', formatTime12h(isoToDate(T.Maghrib))); setText('t_maghrib_e', formatTime12h(trueIshaTime)); setText('t_isha_e', formatTime12h(isoToDate(T.Midnight)));
    const duha=computeDuha(T.Sunrise,T.Dhuhr); setText('t_duha_s', formatTime12h(duha.start)); setText('t_duha_e', formatTime12h(duha.end)); 
    const last=computeLastThird(T.Maghrib,TT.Fajr); setText('t_lastthird_s', formatTime12h(last.start)); setText('t_lastthird_e', formatTime12h(last.end)); 
    renderNextPrayer(T,TT.Fajr);

    // تخزين الأوقات لتعمل في وضع عدم الاتصال (Offline)
    if(save) {
      LS('offline_T', JSON.stringify(T)); LS('offline_TT', JSON.stringify(TT)); LS('offline_T_True', JSON.stringify(T_True));
      LS('offline_last_saved', String(Date.now()));
    }
  };

  const useOffline = () => {
     try {
        let T = JSON.parse(LS('offline_T')), TT = JSON.parse(LS('offline_TT')), T_True = JSON.parse(LS('offline_T_True'));
        if(T && TT && T_True) {
           T = shiftTimingsToDate(T, today); T_True = shiftTimingsToDate(T_True, today); TT = shiftTimingsToDate(TT, tomorrow);
           renderTimes(T, TT, T_True, false);
           const lastSaved = parseInt(LS('offline_last_saved') || '0', 10);
           const daysPassed = lastSaved ? (Date.now() - lastSaved) / 86400000 : 3;
           const isAccurate = daysPassed <= 2;
           setText('ptStatus', currentLang==='ar' ? `وضع عدم الاتصال (أوقات ${isAccurate ? 'صحيحة' : 'تقريبية'})` : `Offline Mode (${isAccurate ? 'Accurate' : 'Approximate'} times)`);
           if(controls) controls.style.display = 'none'; // إخفاء الاختيار اليدوي لأن المشكلة إنترنت وليست موقع
           const savedCity = getCityFallback(); updateCityKPI(savedCity.label||savedCity.city);
           return true;
        }
     }catch(e){}
     return false;
  };

  try{
    if(!navigator.onLine) throw new Error('OFFLINE');

    if(!forceCity && 'geolocation' in navigator){
      updateCityKPI(t('locating')); 
      const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res, err=>rej(new Error('GEO')),{enableHighAccuracy:true,timeout:12000,maximumAge:600000})); 
      const lat=pos.coords.latitude, lon=pos.coords.longitude; 
      const acc = Math.round(pos.coords.accuracy||0); let accText = 'عالية';
      if(acc > 500) { accText = currentLang==='ar'?'سيئة':'Low'; if(controls) controls.style.display = 'flex'; } 
      else { if(acc > 50) accText = currentLang==='ar'?'متوسطة':'Medium'; else accText = currentLang==='ar'?'عالية':'High'; if(controls) controls.style.display = 'none'; }
      setText('ptMeta', currentLang==='ar' ? `دقة الموقع: ${accText}` : `Accuracy: ${accText}`);
      const rg=reverseGeocodeCity(lat,lon).catch(()=>null); 
      const td=await fetchTimingsByCoords(today,lat,lon); const td2=await fetchTimingsByCoords(tomorrow,lat,lon); const tdTrue=await fetchTimingsByCoords(today,lat,lon, 3); 
      const city=await rg; updateCityKPI(city&&city.city?city.city:t('my_location')); setQiblaFromCoords(lat,lon);
        renderTimes(td.timings, td2.timings, tdTrue.timings, td.meta);
    } else {
      if(controls) controls.style.display = 'flex'; updateCityKPI(c.label||c.city); 
      const td=await fetchTimingsByCity(today,c.city,c.country); const td2=await fetchTimingsByCity(tomorrow,c.city,c.country); const tdTrue=await fetchTimingsByCity(today,c.city,c.country, 3);
        renderTimes(td.timings, td2.timings, tdTrue.timings, td.meta);
    } 
  }catch(e){
    // تمييز مشكلة انقطاع الإنترنت عن مشكلة إغلاق الموقع الجغرافي
    if(e.message === 'OFFLINE' || !navigator.onLine) {
       if(!useOffline()) {
         if(controls) controls.style.display = 'flex'; setText('ptStatus', currentLang==='ar'?'لا يوجد اتصال بالإنترنت':'No internet connection'); updateCityKPI(c.label||c.city);
       }
       return;
    }

    if(e.message === 'GEO') {
        if(controls) controls.style.display = 'flex'; setText('ptStatus', t('location_disabled')); updateCityKPI(c.label||c.city);
        try {
            const td = await fetchTimingsByCity(today,c.city,c.country); const td2 = await fetchTimingsByCity(tomorrow,c.city,c.country); const tdTrue = await fetchTimingsByCity(today,c.city,c.country, 3);
              renderTimes(td.timings, td2.timings, tdTrue.timings, td.meta);
        } catch(ex){
            if(!useOffline()) setText('ptStatus', t('location_disabled') + ' - ' + (currentLang==='ar'?'فشل التحميل':'Load failed'));
        }
    } else {
        if(!useOffline()) {
           if(controls) controls.style.display = 'flex'; setText('ptStatus', currentLang==='ar'?'خطأ في الاتصال':'Connection error'); updateCityKPI(c.label||c.city);
        }
    }
  }
}

export function haptic(ms=10){try{if(navigator.vibrate) navigator.vibrate(ms);}catch(e){}}

function setupTasbeeh(){
  const select=qs('#tasbeehPhraseSelect'), current=qs('#currentTasbeeh'), countEl=qs('#tasbeehCount'), targetEl=qs('#tasbeehTarget'), btn=qs('#tasbeehBtn'), resetBtn=qs('#tasbeehReset'), nextBtn=qs('#tasbeehNext'); 
  if(!select||!current||!countEl||!targetEl||!btn||!resetBtn||!nextBtn) return; 

  select.innerHTML=''; 
  TASBEEH_PHRASES.forEach((p,idx)=>{const o=document.createElement('option'); o.value=String(idx); o.textContent=`${p.name} — ${p.target}`; select.appendChild(o);}); 

  let phraseIndex=parseInt(LS('tasbeehPhraseIndex')||'0',10); 
  let count=parseInt(LS('tasbeehCount')||'0',10); 
  
  // --- منطق التصفير التلقائي كل ساعتين ---
  let lastReset = parseInt(LS('tasbeehLastReset') || '0', 10);
  const TWO_HOURS = 2 * 60 * 60 * 1000; // ساعتان بالملي ثانية

  const checkAutoReset = () => {
    const now = Date.now();
    if (lastReset === 0 || (now - lastReset) >= TWO_HOURS) {
      count = 0;
      lastReset = now;
      LS('tasbeehLastReset', String(lastReset));
      save();
    }
  };
  // ---------------------------------------

  function render(){
    const p=TASBEEH_PHRASES[phraseIndex]; 
    select.value=String(phraseIndex); 
    current.textContent=p.name; 
    countEl.textContent=String(count); 
    targetEl.textContent=`الهدف: ${p.target}`;
  } 

  function save(){
    LS('tasbeehPhraseIndex', String(phraseIndex)); 
    LS('tasbeehCount', String(count));
  } 

  // تشغيل فحص التصفير عند البداية
  checkAutoReset();

  select.addEventListener('change',()=>{
    phraseIndex=parseInt(select.value,10)||0; 
    count=0; 
    save(); 
    render(); 
    haptic(10);
  }); 

  const increment=()=>{
    checkAutoReset(); // فحص الوقت عند كل ضغطة للتأكد
    const p=TASBEEH_PHRASES[phraseIndex]; 
    count+=1; 
    save(); 
    render(); 
    // 4. احتفالية أهداف التسبيح
    if(count===p.target) {
      haptic([28,35,28]);
      showToast('🎉 تقبل الله! أتممت الهدف.');
      countEl.style.transform = 'scale(1.3)'; countEl.style.color = 'var(--accent)'; countEl.style.transition = 'all 0.3s';
      setTimeout(() => { countEl.style.transform = 'none'; countEl.style.color = ''; }, 600);
    } else haptic(9);
  }; 

  btn.addEventListener('click',increment); 
  btn.addEventListener('touchstart',()=>haptic(7),{passive:true}); 
  
  // 5. هز الجهاز لتصفير التسبيح
  let lastX, lastY, lastZ, lastShake = 0;
  window.addEventListener('devicemotion', (e) => {
    if(btn?.closest('.section')?.classList.contains('active')){
      const acc = e.accelerationIncludingGravity; if(!acc) return;
      const diff = Math.abs(acc.x - (lastX||acc.x)) + Math.abs(acc.y - (lastY||acc.y)) + Math.abs(acc.z - (lastZ||acc.z));
      if(diff > 25 && Date.now() - lastShake > 2000) {
        lastShake = Date.now();
        resetBtn.click();
        showToast('تم التصفير بالهز 📳');
      }
      lastX = acc.x; lastY = acc.y; lastZ = acc.z;
    }
  });

  resetBtn.addEventListener('click',()=>{
    count=0; 
    lastReset = Date.now(); // تحديث وقت التصفير يدوياً أيضاً
    LS('tasbeehLastReset', String(lastReset));
    save(); 
    render(); 
    haptic(15);
  }); 

  nextBtn.addEventListener('click',()=>{
    phraseIndex=(phraseIndex+1)%TASBEEH_PHRASES.length; 
    count=0; 
    save(); 
    render(); 
    haptic([15,18,15]);
  }); 

  render();
}
function dayKey(){return new Date().toDateString()}

function updateGlobalProgress(list, keyPrefix) {
  const bar = qs('#globalAdhkarProgress'); if(!bar) return;
  if(list.length === 0) { bar.style.width = '0%'; return; }
  const completed = list.filter((it, i) => { const k=`dhikr:${keyPrefix}:${i}:${dayKey()}`; const rem = LS(k); if(typeof it.repeat === 'number') return rem === '0'; return true; }).length;
  bar.style.width = Math.round((completed / list.length) * 100) + '%';
}

function renderPager(container,list,keyPrefix){
  if(!list) return; updateGlobalProgress(list, keyPrefix);
  let index=parseInt(LS(`pager:${keyPrefix}:index`)||'0',10); if(Number.isNaN(index)||index<0||index>=list.length) index=0;
  const lastSavedTime = parseInt(LS(`pager:${keyPrefix}:time`)||'0',10);
  if(Date.now() - lastSavedTime > 6 * 3600 * 1000) { index = 0; }
  LS(`pager:${keyPrefix}:time`, String(Date.now()));
  const host=document.createElement('div'); host.className='pager-wrap'; const indexEl=document.createElement('div'); indexEl.className='pager-index'; const card=document.createElement('div'); card.className='pager-card'; const controls=document.createElement('div'); controls.className='pager-controls'; const prev=document.createElement('button'); prev.className='btn secondary'; prev.textContent=t('pager_prev'); const next=document.createElement('button'); next.className='btn'; next.textContent=t('pager_next'); 
  controls.append(prev,next); host.append(indexEl,card,controls); container.appendChild(host); 

  function update(){
    const it=list[index]; if(!it) return; const max=it.repeat; const numeric=typeof max==='number'; const repeatedOnce=numeric&&max===1; 
    const k=`dhikr:${keyPrefix}:${index}:${dayKey()}`; let rem=LS(k); rem=rem==null?(numeric?max:0):parseInt(rem,10); if(!numeric) rem=0; 
    const pct=numeric&&max>0?Math.round(((max-rem)/max)*100):0; indexEl.textContent=`${index+1} / ${list.length}`; 
    const whenHtml=it.when?`<span class="when-chip">${it.when}</span>`:''; 
    const repeatHtml=repeatedOnce?'':`<button class="btn ${numeric?'':'secondary'} repeat-square ${numeric&&rem===0?'done':''} ${(!numeric||String(max).length>2)?'wide':''} do">${numeric?(rem===0?t('pager_done'):String(rem)):String(max)}</button>`; 
    const displayText = showTashkeel ? it.text : (it.text||'').replace(/[\u064B-\u065F\u0640]/g, '');
    
    // زر النطق الصوتي للذكر
    const playBtnHtml = `<button class="btn secondary tiny play-audio">🔊 استماع</button>`;
    
    card.innerHTML=`<p class="dhikr-text">${displayText}</p><div class="pager-meta"><span>${t('pager_source')} ${it.source||'—'}</span>${whenHtml}</div>${numeric&&!repeatedOnce?'<div class="progress"><div style="width:'+pct+'%"></div></div>':''}<div class="actions"><div class="left"><button class="btn secondary tiny copy">${t('pager_copy')}</button>${playBtnHtml}<a class="mini-link" href="${it.ref||'#'}" target="_blank" rel="noopener">${t('pager_ref')}</a></div>${repeatHtml}</div>`; 
    // 8. تأكيد مرئي للنسخ
    card.querySelector('.copy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(displayText); haptic(8); showToast('تم النسخ بنجاح ✓');}catch(e){}}); 
    card.querySelector('.play-audio')?.addEventListener('click', () => {
        if('speechSynthesis' in window) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(displayText); u.lang = 'ar-SA'; u.rate = 0.85; window.speechSynthesis.speak(u); } else { showToast('متصفحك لا يدعم القراءة الصوتية'); }
    });

    const btn=card.querySelector('.do'); const bar=card.querySelector('.progress>div'); 
    if(btn&&numeric){
      btn.addEventListener('click',()=>{
        // 14. تأثير الانكماش النبضي للزر (Ripple/Pulse)
        btn.style.transform = 'scale(0.9)'; setTimeout(() => btn.style.transform = 'none', 150);
        
        if(rem<=0) return; rem-=1; LS(k,String(rem)); const p=Math.round(((max-rem)/max)*100); 
        if(bar) bar.style.width=p+'%'; btn.textContent=rem===0?t('pager_done'):String(rem); btn.classList.toggle('done', rem===0); haptic(rem===0?[20,28,20]:8);
        updateGlobalProgress(list, keyPrefix);
      });
    } 
    if(btn&&!numeric) btn.disabled=true; prev.disabled=index===0; next.disabled=index===list.length-1; LS(`pager:${keyPrefix}:index`,String(index));
  } 
  prev.addEventListener('click',()=>{if(index>0){index-=1; update(); haptic(8);}}); next.addEventListener('click',()=>{if(index<list.length-1){index+=1; update(); haptic(8);}}); 
  update();
}

function renderDhikrList(container,list,keyPrefix){container.innerHTML=''; renderPager(container,list,keyPrefix);}

async function loadAdhkar(){
  const fallbackData = {"morning":[],"evening":[],"sleep":[],"wakeup":[],"afterPrayer":[],"home":[],"mosque":[],"friday":[],"daily":[]};
  rawAdhkarData = await fetchJSON('./data/adhkar.json', fallbackData);
  const tabs=[
    {key:'morning'}, {key:'evening'}, {key:'sleep'},
    {key:'wakeup'}, {key:'afterPrayer'}, {key:'home'},
    {key:'mosque'}, {key:'worry'}, {key:'travel'},
    {key:'illness'}, {key:'dua'}, {key:'friday'}, {key:'daily'}
  ];
  const pills=qs('#adhkarPills'), container=qs('#adhkarContainer'); if(!pills||!container) return; 
  function activate(key){qsa('#adhkarPills button').forEach(b=>b.classList.toggle('active',b.dataset.key===key)); renderDhikrList(container,rawAdhkarData[key]||[],key);} 
  pills.innerHTML=''; tabs.forEach(tabObj=>{const b=document.createElement('button'); b.textContent=t(`tab_${tabObj.key}`); b.dataset.key=tabObj.key; b.addEventListener('click',()=>activate(tabObj.key)); pills.appendChild(b);}); activate('morning');
}

async function loadDailyBenefit() {
  const fallback = ["من لزم الاستغفار جعل الله له من كل هم فرجاً، ومن كل ضيق مخرجاً."];
  let benefits = fallback;
  try {
    const res = await fetch('./data/benefits.json');
    if(res.ok) { benefits = await res.json(); LS('cached_benefits', JSON.stringify(benefits)); } 
    else throw new Error();
  } catch(e) {
    const cached = LS('cached_benefits'); if(cached) benefits = JSON.parse(cached);
  }
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const todayBenefit = benefits[dayOfYear % benefits.length];
  const container = qs('#dailyBenefitContent'); 
  // 6. إصلاح تأثير الآلة الكاتبة للفوائد
  if(container) {
    container.style.direction = ['ar', 'ur', 'fa'].includes(currentLang) ? 'rtl' : 'ltr';
    
    if (todayBenefit.includes('<')) {
      // إذا كان النص يحتوي على وسوم HTML نعرضه مباشرة مع تأثير ظهور تدريجي لتجنب التشوه
      container.innerHTML = todayBenefit;
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.8s';
      setTimeout(() => container.style.opacity = '1', 50);
    } else {
      container.textContent = ''; let i = 0;
      const chars = Array.from(todayBenefit); // استخدام Array.from يمنع تقطيع الرموز التعبيرية والحروف التي تسبب انعكاس النص
      const typeWriter = setInterval(() => { 
        if(i < chars.length) { container.textContent = chars.slice(0, i + 1).join(''); i++; } 
        else { clearInterval(typeWriter); } 
      }, 35);
    }
  }
}

async function loadResources(){const data = await fetchJSON('./data/resources.json', {useful:[]}); const host=qs('#usefulLinks'); if(!host) return; host.innerHTML=''; (data.useful||[]).forEach(g=>{const sec=document.createElement('div'); sec.className='pager-card'; sec.innerHTML=`<h3 class="section-title">${g.group}</h3>`; const ul=document.createElement('ul'); ul.className='custom-list'; (g.items||[]).forEach(it=>{const li=document.createElement('li'); li.innerHTML=`<a href="${it.url}" target="_blank" rel="noopener">${it.title}</a> <span class="small" style="display:block; margin-top:4px;">${it.desc||''}</span>`; ul.appendChild(li);}); sec.appendChild(ul); host.appendChild(sec);});}
async function loadLearning(){const data = await fetchJSON('./data/learning.json', {plan:[], collections:[], reminders:[]}); const plan=qs('#learnPlan'), col=qs('#learnCollections'), rem=qs('#learnReminders'); if(plan){plan.innerHTML=''; (data.plan||[]).forEach(it=>{const d=document.createElement('div'); d.className='pager-card'; d.innerHTML=`<b style="font-size:1.4rem; color:var(--accent); display:block; margin-bottom:8px;">${it.title}</b><div style="font-size:1.3rem; line-height:1.8;">${it.tip}</div>`; plan.appendChild(d);});} if(col){col.innerHTML=''; (data.collections||[]).forEach(it=>{const li=document.createElement('li'); li.innerHTML=`<a href="${it.url}" target="_blank" rel="noopener">${it.title}</a>`; col.appendChild(li);});} if(rem){rem.innerHTML=''; (data.reminders||[]).forEach(t=>{const li=document.createElement('li'); li.textContent=t; rem.appendChild(li);});}}
function showUpdateBar(reg){const bar=qs('#updateBar'); if(!bar) return; bar.style.display='flex'; qs('#updateNow')?.addEventListener('click',()=>{if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});},{once:true}); qs('#updateLater')?.addEventListener('click',()=>{bar.style.display='none';},{once:true});}
async function registerSW(){
  if(!('serviceWorker' in navigator)) return; 
  const reg=await navigator.serviceWorker.register('./service-worker.js',{scope:'./'}); 
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange',()=> { if(!isRefreshing) { isRefreshing=true; window.location.reload(); } }); 
  try{await reg.update();}catch(e){} 
  if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'}); 
  reg.addEventListener('updatefound',()=>{const sw=reg.installing; if(!sw) return; sw.addEventListener('statechange',()=>{if(sw.state==='installed'&&navigator.serviceWorker.controller) sw.postMessage({type:'SKIP_WAITING'});});});
}

qs('#backToSurahs')?.addEventListener('click', () => {
  qs('#quranReader').style.display = 'none';
  qs('#surahList').style.display = 'grid';
  window.scrollTo({top: 0, behavior: 'smooth'});
});

async function loadAsmaUlHusna() {
  const container = qs('#asmaContainer'); if(!container) return;
  container.innerHTML = `<div style="text-align:center; padding: 20px;">${t('loading')}</div>`;
  try {
    const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
    const data = await res.json();
    container.innerHTML = data.data.map(n => `
      <div class="asma-card pager-card" style="text-align:center; padding:15px; margin-bottom:10px; background:var(--bg2); border-radius:var(--radius);">
        <div style="font-size:2.5rem; color:var(--accent); font-weight:bold; margin-bottom:5px;">${n.name}</div>
        <div style="font-size:1.2rem; color:var(--fg);">${currentLang === 'ar' ? n.en.meaning : (n.transliteration + ' - ' + n.en.meaning)}</div>
      </div>
    `).join('');
  } catch (e) { container.innerHTML = `<div style="text-align:center;">خطأ في تحميل أسماء الله الحسنى.</div>`; }
}

function setupZakatCalculator() {
  const btn = qs('#btnCalcZakat'); const res = qs('#zakatResult');
  if(!btn || !res) return;
  btn.addEventListener('click', () => {
    const cash = parseFloat(qs('#zakatCash')?.value) || 0;
    const gold = parseFloat(qs('#zakatGold')?.value) || 0;
    const silver = parseFloat(qs('#zakatSilver')?.value) || 0;
    res.textContent = t('zakat_result') + ' ' + ((cash + gold + silver) * 0.025).toFixed(2);
    haptic(10);
  });
}

function setupMissedPrayers() {
  ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(p => {
    const key = 'missed_' + p; let count = parseInt(LS(key)) || 0;
    const countEl = qs('#missedCount_' + p); if(!countEl) return;
    countEl.textContent = count;
    qs('#btnMissedAdd_' + p)?.addEventListener('click', () => { LS(key, ++count); countEl.textContent = count; haptic(10); });
    qs('#btnMissedSub_' + p)?.addEventListener('click', () => { if(count > 0) { LS(key, --count); countEl.textContent = count; haptic(10); } });
  });
}

async function init(){
  CFG = { calculation: { method: LS('calcMethod') || 'auto', school: LS('calcSchool') || 'auto' }, duha: { startOffsetAfterSunriseMin: 15, endOffsetBeforeDhuhrMin: 10 }, defaultCity: { label: 'مكة المكرمة', city: 'Makkah', country: 'SA' } };
   initScheme(); applyLang(); initUI(); initNav(); initCityList(); renderHijri(); loadStoredQibla(); setupCompass(); setupTasbeeh(); 
  setupTrueIshaToggle(); setupTimeFormatToggle(); setupZakatCalculator(); setupMissedPrayers();
  qs('#useLocation')?.addEventListener('click',()=>loadPrayerTimes(false)); 
  await loadPrayerTimes(false); await registerSW();
  // 2. تحية ذكية مرتبطة بالوقت
  const h = new Date().getHours(); const greet = h < 12 ? 'صباح الخير ☀️' : h < 18 ? 'مساء الخير 🌤️' : 'مساء النور 🌙';
  setTimeout(() => showToast(greet + '، أهلاً بك في تهجد'), 1500);
}
window.addEventListener('load',init);

let deferredPrompt;
const installContainer = document.getElementById('installContainer');
const btnInstallApp = document.getElementById('btnInstallApp');

// الإمساك بحدث طلب التثبيت من المتصفح
window.addEventListener('beforeinstallprompt', (e) => {
  // منع المتصفح من إظهار التنبيه التلقائي
  e.preventDefault();
  // حفظ الحدث لاستخدامه لاحقاً
  deferredPrompt = e;
  // إظهار الحاوية المخفية في واجهة التطبيق
  if (installContainer) installContainer.style.display = 'block';
});

// تنفيذ التثبيت عند الضغط على الزر
btnInstallApp?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  // إظهار نافذة التثبيت الخاصة بالمتصفح
  deferredPrompt.prompt();
  // انتظار رد المستخدم
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
    if (installContainer) installContainer.style.display = 'none';
  }
  deferredPrompt = null;
});

// إخفاء الزر إذا تم تثبيت التطبيق بالفعل
window.addEventListener('appinstalled', () => {
  if (installContainer) installContainer.style.display = 'none';
  deferredPrompt = null;
});

// دالة حذف الكاش بالكامل وإعادة التحميل
window.clearAppCache = async function() {
  if(confirm(currentLang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف الكاش وإعادة تحميل التطبيق؟' : 'Are you sure you want to clear the cache and reload?')) {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      window.location.reload(true);
    } catch(e) { alert('حدث خطأ أثناء محاولة حذف الكاش.'); }
  }
};