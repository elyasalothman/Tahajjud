import { qs, LS, t, showTashkeel, currentLang, setText, showToast } from './app.js';

export let allSurahs = []; 
export let currentQuranPage = 1;
export let currentReciter = LS('quranReciter') || 'ar.alafasy';
export let quranFontSize = parseFloat(LS('quranFontSize')) || 1.8;
export let quranNightMode = LS('quranNightMode') === 'true';

export async function loadSurahList() {
  const container = document.getElementById('surahList');
  if (!container) return;
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah?v=${Date.now()}`);
    const data = await res.json();
    allSurahs = data.data;
    renderSurahs(allSurahs);
    setupQuranSearch();
    setupQuranTabs();
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px;">حدث خطأ في الاتصال.<br><button class="btn" onclick="loadSurahList()" style="margin-top:15px;">إعادة المحاولة 🔄</button></div>`;
  }
}

function renderSurahs(list) {
  const container = document.getElementById('surahList');
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center; width:100%; padding: 20px;">لا توجد نتائج</div>';
    return;
  }
  list.forEach(s => {
    // 9. تقدير وقت القراءة
    const timeEst = Math.max(1, Math.ceil(s.numberOfAyahs * 12 / 60));
    const el = document.createElement('div');
    el.className = 'surah-card';
    el.innerHTML = `
      <div class="surah-info">
        <div class="surah-name">${s.name}</div>
        <div class="surah-meta">${s.revelationType === 'Meccan' ? (currentLang==='ar'?'مكية':'Meccan') : (currentLang==='ar'?'مدنية':'Medinan')} • ${s.numberOfAyahs} ${currentLang==='ar'?'آية':'Ayahs'} • ⏱️ ~${timeEst} دقيقة</div>
      </div>
      <div class="surah-number" style="color: var(--muted); font-weight: bold;">${s.number}</div>
    `;
    el.addEventListener('click', () => openSurah(s.number, s.name));
    container.appendChild(el);
  });
}

function setupQuranSearch() {
  const searchInput = document.getElementById('quranSearch');
  searchInput?.addEventListener('input', (e) => {
    const term = e.target.value.trim();
    const filtered = allSurahs.filter(s => s.name.includes(term));
    renderSurahs(filtered);
  });
}

function setupQuranTabs() {
  const quranTabs = document.getElementById('quranTabs');
  if (quranTabs && !document.querySelector('[data-tab="bookmarks"]')) {
    const bTab = document.createElement('button');
    bTab.className = 'btn secondary';
    bTab.dataset.tab = 'bookmarks';
    bTab.textContent = currentLang === 'ar' ? 'المحفوظات' : 'Bookmarks';
    quranTabs.appendChild(bTab);
    quranTabs.style.gridTemplateColumns = `repeat(${quranTabs.children.length}, 1fr)`;
  }

  const tabs = document.querySelectorAll('#quranTabs button');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const searchInput = document.getElementById('quranSearch');
      
      if (tab.dataset.tab === 'juz') {
        if(searchInput) searchInput.style.display = 'none';
        renderJuzList();
      } else if (tab.dataset.tab === 'page') {
        if(searchInput) searchInput.style.display = 'none';
        renderPageList();
      } else if (tab.dataset.tab === 'bookmarks') {
        if(searchInput) searchInput.style.display = 'none';
        renderBookmarksList();
      } else {
        if(searchInput) searchInput.style.display = 'block';
        renderSurahs(allSurahs);
      }
    });
  });
}

async function renderBookmarksList() {
  const container = document.getElementById('surahList');
  let savedAyahs = [];
  try { const s = LS('savedAyahs'); if(s) savedAyahs = JSON.parse(s); else if(LS('savedAyah')) savedAyahs = [parseInt(LS('savedAyah'))]; } catch(e){}
  
  if (savedAyahs.length === 0) {
    container.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding:30px; color:var(--muted);">${currentLang === 'ar' ? 'لا توجد آيات محفوظة حالياً 📌' : 'No saved bookmarks yet 📌'}</div>`;
    return;
  }
  
  container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--accent); font-weight:bold;">${t('loading')}</div>`;
  
  try {
    const fetches = savedAyahs.map(id => fetch(`https://api.alquran.cloud/v1/ayah/${id}/quran-uthmani`).then(res => res.json()));
    const results = await Promise.all(fetches);
    
    container.innerHTML = '';
    results.forEach(res => {
       if(res.code === 200) {
         const a = res.data;
         const el = document.createElement('div');
         el.className = 'surah-card';
         el.style.textAlign = 'right';
         el.innerHTML = `
           <div style="font-size: 1.4rem; font-weight: bold; color: var(--accent); margin-bottom: 8px;">${a.surah.name} - آية ${a.numberInSurah}</div>
           <div style="font-size: 1.4rem; color: var(--fg); line-height: 1.8; margin-bottom: 15px; font-family: 'Amiri', serif;">${a.text} ﴿${a.numberInSurah}﴾</div>
           <div style="display:flex; gap:10px; width: 100%;">
              <button class="btn secondary tiny" style="flex:2;" onclick="window.openPage(${a.page})">📖 الانتقال للصفحة ${a.page}</button>
              <button class="btn secondary tiny" style="flex:1; color:var(--danger); border-color:var(--danger);" onclick="window.bookmarkAyah(${a.number}, ${a.surah.number}, ${a.numberInSurah}); setTimeout(()=>document.querySelector('[data-tab=\\'bookmarks\\']').click(), 300);">❌ إزالة</button>
           </div>
         `;
         container.appendChild(el);
       }
    });
  } catch(e) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--danger);">حدث خطأ أثناء جلب العلامات المرجعية. تأكد من اتصالك بالإنترنت.</div>`;
  }
}

function renderJuzList() {
  const container = document.getElementById('surahList');
  container.innerHTML = '';
  for (let i = 1; i <= 30; i++) {
    const el = document.createElement('div');
    el.className = 'surah-card';
    el.innerHTML = `<div class="surah-name">${currentLang==='ar'?'الجزء':'Juz'} ${i}</div>`;
    el.addEventListener('click', () => openJuz(i));
    container.appendChild(el);
  }
}

function renderPageList() {
    const container = document.getElementById('surahList');
    container.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 20px; background: var(--bg);">
            <h3 style="color: var(--accent); margin-bottom: 15px;">${currentLang==='ar'?'الانتقال لصفحة محددة':'Go to specific page'}</h3>
            <input type="number" id="pageInputGo" min="1" max="604" placeholder="${currentLang==='ar'?'أدخل رقم الصفحة (1 - 604)':'Enter page number (1-604)'}" 
                   style="width: 100%; padding: 15px; margin-bottom: 15px; border-radius: var(--radius); border: 2px solid var(--border); background: var(--bg2); color: var(--fg); text-align: center; font-size: 1.5rem; outline: none;">
            <button class="btn" id="btnGoToPage" style="width: 100%; font-size: 1.4rem;">${currentLang==='ar'?'اذهب للصفحة':'Go to Page'}</button>
        </div>
    `;
    document.getElementById('btnGoToPage')?.addEventListener('click', () => {
        const p = parseInt(document.getElementById('pageInputGo').value);
        if (p >= 1 && p <= 604) openPage(p);
        else alert('الرجاء إدخال رقم صحيح بين 1 و 604');
    });
}

async function openJuz(num) {
  toggleQuranView(true);
  setText('surahTitle', `الجزء ${num}`);
  const textEl = document.getElementById('quranText');
  textEl.innerHTML = t('loading');
  const controls = document.getElementById('quranPageControls');
  if(controls) controls.style.display = 'none';
  
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/juz/${num}/quran-uthmani?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.data || !data.data.ayahs) throw new Error('بيانات غير مكتملة');
    renderAyahs(data.data.ayahs);
  } catch (e) {
    console.error(e);
    textEl.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px;line-height:1.6;">تعذر التحميل (${e.message}).<br>تأكد من اتصالك بالإنترنت.<br><br><button class="btn" onclick="openJuz(${num})">إعادة المحاولة 🔄</button></div>`;
  }
}

export async function openSurah(number, name) {
  toggleQuranView(true);
  setText('surahTitle', name);
  const textEl = document.getElementById('quranText');
  textEl.innerHTML = t('loading');
  const controls = document.getElementById('quranPageControls');
  if(controls) controls.style.display = 'none';
  
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/quran-uthmani?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || !data.data || !data.data.ayahs) throw new Error('بيانات غير مكتملة');
    const ayahs = data.data.ayahs.map(a => {
      if (!a.surah) a.surah = data.data;
      return a;
    });
    renderAyahs(ayahs);
  } catch (e) {
    console.error(e);
    const safeName = name ? name.replace(/'/g, "\\'") : '';
    textEl.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px;line-height:1.6;">تعذر التحميل (${e.message}).<br>تأكد من اتصالك بالإنترنت.<br><br><button class="btn" onclick="openSurah(${number}, '${safeName}')">إعادة المحاولة 🔄</button></div>`;
  }
}

export async function openPage(pageNum) {
    if (pageNum < 1) pageNum = 1;
    if (pageNum > 604) pageNum = 604;
    currentQuranPage = pageNum;
    LS('lastReadPage', pageNum);
    checkLastRead();
    
    toggleQuranView(true);
    const controls = document.getElementById('quranPageControls');
    if(controls) {
      controls.style.display = 'flex';
    }
    setText('pageInfo', `ص ${pageNum}`);
    setText('surahTitle', `الصفحة ${pageNum}`);
    
    const textEl = document.getElementById('quranText');
    textEl.innerHTML = t('loading');
    
    const cacheKey = `quran_page_${pageNum}`;
    try {
        const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani?v=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.data || !data.data.ayahs) throw new Error('بيانات غير مكتملة');
        
        // حفظ البيانات محلياً للعمل بدون إنترنت (التحميل المسبق)
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e){}
        
        if(data.data.ayahs.length > 0) {
            setText('surahTitle', `${data.data.ayahs[0].surah.name} - ص ${pageNum}`);
        }
        renderAyahs(data.data.ayahs);
    } catch (e) {
        console.error(e);
        // محاولة جلب النسخة المحفوظة محلياً في حال غياب الإنترنت
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const data = JSON.parse(cached);
            if(data.data.ayahs.length > 0) setText('surahTitle', `${data.data.ayahs[0].surah.name} - ص ${pageNum} (غير متصل)`);
            renderAyahs(data.data.ayahs);
            showToast('وضع عدم الاتصال: تم تحميل الصفحة المحفوظة مسبقاً 📶');
        } else {
            textEl.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px;line-height:1.6;">تعذر التحميل (${e.message}).<br>لا توجد نسخة محفوظة مسبقاً.<br><br><button class="btn" onclick="openPage(${pageNum})">إعادة المحاولة 🔄</button></div>`;
        }
    }
}

window.quranAudio = new Audio();
let audioAyahs = [];
let currentAudioIndex = 0;

window.applyQuranFontSize = function() {
    const qtext = document.getElementById('quranText');
    if(qtext) qtext.style.fontSize = quranFontSize + 'rem';
    LS('quranFontSize', quranFontSize);
};

window.applyQuranNightMode = function() {
    const qtext = document.getElementById('quranText');
    const qbtn = document.getElementById('btnQNight');
    if(qtext) {
        if(quranNightMode) { qtext.classList.add('quran-night-mode'); if(qbtn) { qbtn.style.backgroundColor = 'var(--accent)'; qbtn.style.color = '#000'; qbtn.style.borderColor = 'var(--accent)'; } }
        else { qtext.classList.remove('quran-night-mode'); if(qbtn) { qbtn.style.backgroundColor = ''; qbtn.style.color = ''; qbtn.style.borderColor = ''; } }
    }
    LS('quranNightMode', String(quranNightMode));
};

window.playQuranAudio = function() {
  if(!audioAyahs || audioAyahs.length === 0) return;
  const btn = document.getElementById('btnPlayQuran');
  
  if (!window.quranAudio.paused && window.quranAudio.src) {
    window.quranAudio.pause();
    if(btn) btn.innerHTML = '▶️ ' + (currentLang==='ar'?'استماع':'Play');
    return;
  }
  
  if(btn) btn.innerHTML = '⏸️ ' + (currentLang==='ar'?'إيقاف':'Pause');
  
  if(window.quranAudio.src && window.quranAudio.currentTime > 0) {
      window.quranAudio.play();
  } else {
      playAyah(currentAudioIndex);
  }
};

function playAyah(index) {
  if(index >= audioAyahs.length) {
    const btn = document.getElementById('btnPlayQuran');
    if(btn) btn.innerHTML = '▶️ ' + (currentLang==='ar'?'استماع':'Play');
    currentAudioIndex = 0;
    return;
  }
  document.querySelectorAll('.ayah-text').forEach(el => el.classList.remove('ayah-active'));
  const currentEl = document.getElementById(`ayah-${audioAyahs[index].number}`);
  if(currentEl) {
    currentEl.classList.add('ayah-active');
    currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  window.quranAudio.src = `https://cdn.islamic.network/quran/audio/128/${currentReciter}/${audioAyahs[index].number}.mp3`;
  window.quranAudio.play();
  window.quranAudio.onended = () => {
    currentAudioIndex++;
    playAyah(currentAudioIndex);
  };
}

window.closeTafsir = function() {
  document.getElementById('tafsirModal').style.display = 'none';
};

window.showTafsir = async function(ayahNumber, text, surahNum, ayahInSurah) {
  const modal = document.getElementById('tafsirModal');
  const content = document.getElementById('tafsirContent');
  if(!modal || !content) return;
  
  if (modal.parentElement !== document.body) { document.body.appendChild(modal); }
  
  modal.style.display = 'flex';
  content.innerHTML = `<div style="text-align:center; padding: 20px;">${t('loading')}</div>`;
  
  const tafsirMap = { ar: 'ar.muyassar', en: 'en.sahih', ur: 'ur.jalandhry', bn: 'bn.bengali', id: 'id.indonesian', tr: 'tr.diyanet', fa: 'fa.makarem', fr: 'fr.hamidullah' };
  const edition = tafsirMap[currentLang] || 'ar.muyassar';
  
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/${edition}`);
    const data = await res.json();
    const tafsirName = data.data.edition.name;
        
        let savedAyahs = [];
        try { const s = LS('savedAyahs'); if(s) savedAyahs = JSON.parse(s); else if(LS('savedAyah')) savedAyahs = [parseInt(LS('savedAyah'))]; } catch(e){}
        const isSaved = savedAyahs.includes(ayahNumber);
        const btnText = isSaved ? '❌ إزالة من المحفوظات' : '📌 حفظ في المحفوظات';
        const btnColor = isSaved ? 'transparent' : 'var(--accent)';
        const btnBorder = isSaved ? '1px solid var(--danger)' : 'none';
        const txtColor = isSaved ? 'var(--danger)' : '#fff';
        
    const ayahTextClean = text.replace(/'/g, "\\'");
    content.innerHTML = `
      <div style="font-size:1.6rem; color:var(--accent); margin-bottom:15px; border-bottom: 1px dashed var(--border); padding-bottom: 10px; text-align:center; line-height: 1.6;">${text}</div>
      <div style="display:flex; justify-content:center; gap:8px; margin-bottom: 15px; flex-wrap:wrap;">
         <button class="btn secondary tiny" onclick="navigator.clipboard.writeText('${ayahTextClean} ﴿${ayahInSurah}﴾'); showToast('تم نسخ الآية ✓');">📋 نسخ</button>
         <button class="btn secondary tiny" onclick="if(navigator.share) navigator.share({title:'القرآن الكريم', text:'${ayahTextClean} ﴿${ayahInSurah}﴾'});">📤 مشاركة</button>
         <button class="btn secondary tiny" onclick="window.playSingleAyah(${ayahNumber})">🔊 استماع للآية</button>
      </div>
          <div style="text-align:center; margin-bottom: 20px;">
            <button class="btn" style="background:${btnColor}; color:${txtColor}; border:${btnBorder}; border-radius:20px; font-size:1.1rem; padding:10px 20px; box-shadow:none; width: 100%; max-width: 300px;" onclick="window.bookmarkAyah(${ayahNumber}, ${surahNum}, ${ayahInSurah}); window.closeTafsir();">${btnText}</button>
          </div>
      <div style="font-size:1.1rem; color:var(--muted); margin-bottom:5px; text-align:center;">${tafsirName}:</div>
      <div style="font-size:1.4rem; line-height:1.8; color:var(--fg); text-align:justify;">${data.data.text}</div>
    `;
  } catch(e) {
    content.innerHTML = '<div style="text-align:center; color:var(--danger);">حدث خطأ في جلب التفسير. يرجى التحقق من اتصالك.</div>';
  }
};

window.playSingleAyah = function(ayahNumber) {
   window.quranAudio.pause();
   window.quranAudio.src = `https://cdn.islamic.network/quran/audio/128/${currentReciter}/${ayahNumber}.mp3`;
   window.quranAudio.play();
};

function renderAyahs(ayahs) {
  let html = '';
  audioAyahs = ayahs || []; 
  currentAudioIndex = 0;
  if(window.quranAudio) { window.quranAudio.pause(); window.quranAudio.src = ''; }
  const btnPlay = document.getElementById('btnPlayQuran');
  if (btnPlay) btnPlay.innerHTML = '▶️ ' + (currentLang==='ar'?'استماع':'Play');

  if (!Array.isArray(ayahs)) { document.getElementById('quranText').innerHTML = "<div style='text-align:center;padding:20px;color:var(--danger);'>خطأ: بيانات الآيات غير صالحة. الرجاء التحقق من الاتصال.</div>"; return; }
  
  // تحديث الفهرس السريع ليعرض السورة الحالية
  const quickSel = document.getElementById('quickSurahSelect');
  if (quickSel && ayahs[0] && ayahs[0].surah) {
      quickSel.value = ayahs[0].surah.number;
  }
  // تحويل نظام الحفظ لدعم أكثر من آية مع دعم التوافق للإصدار القديم
  let savedAyahs = [];
  try { const s = LS('savedAyahs'); if(s) savedAyahs = JSON.parse(s); else if(LS('savedAyah')) savedAyahs = [parseInt(LS('savedAyah'))]; } catch(e){}
  let firstSavedAyahId = null;

  let lastPage = null;

  ayahs.forEach(a => {
    // إضافة فاصل الصفحة عند تغير رقم الصفحة (مفيد عند قراءة سورة أو جزء كامل)
    if (lastPage !== null && lastPage !== a.page) {
        html += `<div class="quran-page-separator" style="display:flex; align-items:center; text-align:center; margin: 35px 0; color: var(--muted); font-size: 1.1rem; font-weight:bold; opacity: 0.7; font-family: 'Amiri', serif;">
                   <div style="flex:1; height:1px; background:var(--border);"></div>
                   <div style="padding: 4px 15px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg2); margin: 0 10px;">${currentLang==='ar'?'الصفحة':'Page'} ${a.page}</div>
                   <div style="flex:1; height:1px; background:var(--border);"></div>
                 </div>`;
    }
    lastPage = a.page;

    let aText = a.text || '';
      const surahNum = a.surah ? a.surah.number : null;
      if (a.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9) {
      aText = aText.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
      // 13. إبراز البسملة جمالياً
      html += `<div class="basmalah" style="font-size: 2.2rem; text-align: center; color: var(--accent); margin: 20px 0; font-family: 'Amiri', serif; font-weight: bold; padding-bottom: 10px; border-bottom: 1px dashed var(--border);">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>`;
    }
    let text = showTashkeel ? aText : aText.replace(/[\u064B-\u065F\u0640]/g, '');
    const cleanText = text.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, ' ');
    
    // 15. استدعاء مرئي للآية المحفوظة
    const isSaved = savedAyahs.includes(a.number);
    if (isSaved && !firstSavedAyahId) firstSavedAyahId = a.number;
    const styleStr = isSaved ? 'border-bottom: 2px dashed var(--accent);' : '';
    
    // 10. فتح التفسير (ومن داخله يمكنك حفظ الآية كعلامة مرجعية)
    html += `<span class="ayah-text" id="ayah-${a.number}" data-page="${a.page}" style="${styleStr} cursor:pointer; transition: all 0.3s;" onclick="showTafsir(${a.number}, '${cleanText}', ${surahNum}, ${a.numberInSurah})">${text}</span>`;
    // 12. أرقام الآيات الزخرفية
    html += `<span class="ayah-number" style="display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; border:1.5px solid var(--accent); font-size:0.85rem; margin:0 6px; color:var(--accent); font-weight:bold; background:var(--bg2);">${a.numberInSurah}</span> `;
  });
  document.getElementById('quranText').innerHTML = html;
  
  if (firstSavedAyahId) {
    setTimeout(() => {
      const savedEl = document.getElementById(`ayah-${firstSavedAyahId}`);
      if (savedEl) savedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150); // تأخير بسيط لضمان اكتمال بناء عناصر الـ DOM
  } else {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  
  window.applyQuranFontSize();
  window.applyQuranNightMode();
}

// 10. دالة الحفظ المرجعي (تدعم التعدد والإلغاء)
window.bookmarkAyah = function(id, sNum, aNum) {
  let savedAyahs = [];
  try { const s = LS('savedAyahs'); if(s) savedAyahs = JSON.parse(s); else if(LS('savedAyah')) savedAyahs = [parseInt(LS('savedAyah'))]; } catch(e){}
  
  const idx = savedAyahs.indexOf(id);
  const el = document.getElementById(`ayah-${id}`);
  if (idx > -1) {
    savedAyahs.splice(idx, 1);
    showToast(`تم إزالة الآية ${aNum} من العلامات المرجعية ❌`);
    if (el) el.style.borderBottom = 'none';
  } else {
    savedAyahs.push(id);
    showToast(`تم حفظ الآية ${aNum} كعلامة مرجعية 📌`);
    if (el) el.style.borderBottom = '2px dashed var(--accent)';
  }
  LS('savedAyahs', JSON.stringify(savedAyahs));
};

// 11. التمرير التلقائي للقرآن
let quranScrollInterval;
window.toggleAutoScroll = function() {
    const asBtn = document.getElementById('btnAutoScroll');
    if(quranScrollInterval) { 
        clearInterval(quranScrollInterval); quranScrollInterval=null; 
        showToast('تم إيقاف التمرير التلقائي 🛑'); 
        if(asBtn) { asBtn.innerHTML = '⏬ تمرير'; asBtn.classList.remove('active'); }
    } else { 
        quranScrollInterval = setInterval(() => window.scrollBy({top: 1, behavior: 'auto'}), 40); 
        showToast('بدء التمرير التلقائي ⏬'); 
        if(asBtn) { asBtn.innerHTML = '⏸️ إيقاف'; asBtn.classList.add('active'); }
    }
};

function toggleQuranView(isReading) {
  const surahList = document.getElementById('surahList');
  const quranReader = document.getElementById('quranReader');
  const header = document.querySelector('.quran-header');
  const mainAppHeader = document.querySelector('header');
  const bottomNav = document.querySelector('.bottom-nav');
  
  if(surahList) surahList.style.display = isReading ? 'none' : 'grid';
  if(quranReader) quranReader.style.display = isReading ? 'block' : 'none';
  if(header) header.style.display = isReading ? 'none' : 'block';
  if(mainAppHeader) { mainAppHeader.style.display = isReading ? 'none' : 'block'; mainAppHeader.classList.remove('header-hidden'); }
  if(bottomNav) bottomNav.classList.remove('nav-hidden');
  if(!isReading && window.quranAudio) { window.quranAudio.pause(); window.quranAudio.src = ''; }
  if(!isReading && quranScrollInterval) window.toggleAutoScroll(); // إيقاف التمرير عند الخروج
  
  if (isReading) {
      if(!document.getElementById('quranGlobalControls')) {
          const qText = document.getElementById('quranText');
          if (qText) {
              const extraControls = document.createElement('div');
              extraControls.id = 'quranGlobalControls';
              extraControls.style.cssText = 'position: sticky; top: 75px; z-index: 995; display:flex; gap:10px; width:100%; justify-content:center; margin-bottom:20px; margin-top:5px; flex-wrap:wrap; background: rgba(30, 41, 59, 0.85); padding: 12px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--card-shadow); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);';
              
              // تجهيز قائمة السور للفهرس السريع
              let surahOpts = `<option value="" disabled selected>${currentLang==='ar'?'📖 الفهرس (انتقال سريع)':'📖 Index (Quick Jump)'}</option>`;
              if(allSurahs && allSurahs.length) {
                 allSurahs.forEach(s => surahOpts += `<option value="${s.number}">${s.number}. ${s.name}</option>`);
              }

              extraControls.innerHTML = `
                 <div style="display:flex; width:100%; justify-content:center; margin-bottom:2px;">
                    <select id="quickSurahSelect" class="btn secondary tiny" style="width:100%; max-width:400px; padding: 6px; outline:none; background:var(--bg); color:var(--accent); border:1px solid var(--accent); border-radius:var(--radius); font-size:1.2rem; font-weight:bold; text-align:center; cursor:pointer;">
                       ${surahOpts}
                    </select>
                 </div>
                 <div style="display:flex; gap:6px; align-items:center;">
                    <button class="btn secondary tiny" id="btnQDec" style="padding: 6px 14px; font-weight:bold; font-size:1.2rem;">A-</button>
                    <button class="btn secondary tiny" id="btnQInc" style="padding: 6px 14px; font-weight:bold; font-size:1.2rem;">A+</button>
                    <button class="btn secondary tiny" id="btnQNight" style="padding: 6px 14px; font-weight:bold; font-size:1.2rem;" title="الوضع الليلي">🌙</button>
                    <button class="btn secondary tiny" id="btnAutoScroll" style="padding: 6px 14px; font-weight:bold; font-size:1.2rem;">⏬ تمرير</button>
                 </div>
                 <select id="reciterSelect" class="btn secondary tiny" style="padding: 6px; outline:none; background:var(--bg); color:var(--fg); border:1px solid var(--border); border-radius:var(--radius); font-size:1.1rem; font-weight:bold;">
                    <option value="ar.alafasy">العفاسي</option>
                    <option value="ar.abdulbasitmurattal">عبد الباسط</option>
                    <option value="ar.husary">الحصري</option>
                    <option value="ar.minshawi">المنشاوي</option>
                    <option value="ar.sudais">السديس</option>
                 </select>
              `;
              qText.parentNode.insertBefore(extraControls, qText);
              
              document.getElementById('quickSurahSelect').addEventListener('change', (e) => { const val = parseInt(e.target.value); if(val) { const surah = allSurahs.find(x => x.number === val); if(surah) { if(window.quranAudio && !window.quranAudio.paused) window.quranAudio.pause(); openSurah(surah.number, surah.name); } } });
              document.getElementById('reciterSelect').value = currentReciter;
              document.getElementById('reciterSelect').addEventListener('change', (e) => { currentReciter = e.target.value; LS('quranReciter', currentReciter); if(!window.quranAudio.paused) { window.quranAudio.pause(); const btn = document.getElementById('btnPlayQuran'); if(btn) btn.innerHTML = '▶️ ' + (currentLang==='ar'?'استماع':'Play'); } });
              document.getElementById('btnQInc').addEventListener('click', () => { quranFontSize += 0.2; window.applyQuranFontSize(); });
              document.getElementById('btnQDec').addEventListener('click', () => { quranFontSize = Math.max(1, quranFontSize - 0.2); window.applyQuranFontSize(); });
              document.getElementById('btnQNight').addEventListener('click', () => { quranNightMode = !quranNightMode; window.applyQuranNightMode(); });
              document.getElementById('btnAutoScroll').addEventListener('click', window.toggleAutoScroll);
          }
      }
  }

  // تفعيل خاصية منع إطفاء الشاشة (Wake Lock API)
  if (isReading) {
    if ('wakeLock' in navigator && !window.quranWakeLock) {
      navigator.wakeLock.request('screen').then(lock => window.quranWakeLock = lock).catch(()=>{});
    }
  } else {
    if (window.quranWakeLock) { window.quranWakeLock.release(); window.quranWakeLock = null; }
  }
}

export function checkLastRead() {
    const lastPage = LS('lastReadPage');
    const btn = document.getElementById('btnContinueReading');
    if (lastPage && btn) {
        btn.style.display = 'block';
        btn.innerHTML = `📖 ${t('continue_reading')} (ص ${lastPage})`;
        btn.onclick = () => openPage(parseInt(lastPage));
    }
}

document.getElementById('backToSurahs')?.addEventListener('click', () => {
  if(window.quranAudio) { window.quranAudio.pause(); window.quranAudio.src = ''; }
  toggleQuranView(false);
  window.scrollTo({top: 0, behavior: 'smooth'});
});

document.getElementById('btnNextPage')?.addEventListener('click', () => openPage(currentQuranPage + 1));
document.getElementById('btnPrevPage')?.addEventListener('click', () => openPage(currentQuranPage - 1));
window.openSurah = openSurah;
window.openPage = openPage;

// حفظ موضع القراءة (الصفحة الظاهرة) تلقائياً بالخلفية
setInterval(() => {
    const reader = document.getElementById('quranReader');
    if (reader && reader.style.display === 'block') {
        const visibleAyahs = document.querySelectorAll('.ayah-text');
        for (let el of visibleAyahs) {
            const rect = el.getBoundingClientRect();
            // تجاهل 150 بكسل العلوية لحساب الشريط العلوي الثابت
            if (rect.bottom >= 150 && rect.top <= window.innerHeight) {
                const p = el.getAttribute('data-page');
                if (p && LS('lastReadPage') !== p) {
                    LS('lastReadPage', p);
                    checkLastRead();
                }
                break; // تحديث موضع القراءة لأول آية ظاهرة ووقف البحث
            }
        }
    }
}, 2000);