/* ================= LOADING SCREEN ================= */
(function initLoader() {
    let hidden = false;
    function hideLoader() {
        if (hidden) return;
        hidden = true;
        const loader = document.getElementById('siteLoader');
        if (!loader) return;
        loader.classList.add('loader-hide');
        setTimeout(() => loader.remove(), 700);
    }
    window.addEventListener('load', () => setTimeout(hideLoader, 400));
    // Jaring pengaman agar loading screen tidak pernah tersangkut lebih dari 3 detik
    setTimeout(hideLoader, 3000);
})();

/* ================= TEMA GELAP/TERANG ================= */
function toggleVisionMode() {
    const root = document.documentElement;
    const target = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', target);
    localStorage.setItem('rohis_theme', target);
    document.querySelectorAll('.v-icon').forEach(el => {
        el.className = 'v-icon ' + (target === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon');
    });
}
(function initTheme() {
    const saved = localStorage.getItem('rohis_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

/* ================= NAVIGASI MOBILE ================= */
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('open');
}

/* ================= WAKTU SHALAT REAL-TIME ================= */
async function sinkronisasiWaktuShalat() {
    const elShubuh = document.getElementById('shubuh');
    if (!elShubuh) return;
    try {
        const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Semarang&country=Indonesia&method=2');
        const result = await res.json();
        const t = result.data.timings;
        document.getElementById('shubuh').innerText = t.Fajr;
        document.getElementById('dzuhur').innerText = t.Dhuhr;
        document.getElementById('ashar').innerText = t.Asr;
        document.getElementById('maghrib').innerText = t.Maghrib;
        document.getElementById('isya').innerText = t.Isha;
        document.getElementById('live-date').innerText = result.data.date.readable;
    } catch (err) {
        document.getElementById('shubuh').innerText = '04:26';
        document.getElementById('dzuhur').innerText = '11:43';
        document.getElementById('ashar').innerText = '14:59';
        document.getElementById('maghrib').innerText = '17:39';
        document.getElementById('isya').innerText = '18:53';
        document.getElementById('live-date').innerText = 'Mode Offline';
    }
}
document.addEventListener('DOMContentLoaded', sinkronisasiWaktuShalat);

/* ================= util: daftarkan render ulang otomatis saat data cloud berubah ================= */
function _rohisAutoSync(el, docKey, renderFn) {
    if (!el || el.dataset.rohisBound) return;
    el.dataset.rohisBound = '1';
    window.addEventListener('rohis:sync', function (e) {
        if (!e.detail || e.detail.key === docKey) renderFn();
    });
}

/* ================= RENDER KEGIATAN TERBARU (dipakai di beranda) ================= */
function renderActivityCards(containerId, limit) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const paint = () => {
        const data = ROHIS.getActivities().slice(0, limit || 999);
        if (data.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada dokumentasi kegiatan.</div>';
            return;
        }
        el.innerHTML = data.map(a => `
            <div class="activity-card">
                <img src="${a.img}" class="activity-img" alt="${a.title}" onerror="this.src='assets/img/logo.jpg'">
                <div class="activity-body">
                    <span class="activity-tag">${a.tag}</span>
                    <h4>${a.title}</h4>
                    <p>${a.desc}</p>
                </div>
            </div>
        `).join('');
    };
    paint();
    _rohisAutoSync(el, 'activities', paint);
}

/* ================= KATEGORI KEGIATAN: TAHUNAN / BULANAN / HARIAN =================
   Kegiatan lama (sebelum fitur kategori ada) belum memiliki field "kategori",
   jadi field ini TIDAK memaksa mengubah data tersimpan — hanya dipakai saat
   menampilkan, dengan tebakan otomatis dari isi "tag" sebagai cadangan supaya
   kegiatan lama tetap tampil di salah satu tab. Begitu admin menyimpan/mengedit
   kegiatan lewat panel admin, field "kategori" akan ikut tersimpan permanen. */
const ROHIS_KATEGORI_LIST = [
    { key: 'tahunan', label: 'Tahunan', icon: 'fa-solid fa-calendar-days' },
    { key: 'bulanan', label: 'Bulanan', icon: 'fa-solid fa-calendar-week' },
    { key: 'harian', label: 'Harian', icon: 'fa-solid fa-calendar-day' }
];

function getKategoriKegiatan(item) {
    if (item.kategori && ROHIS_KATEGORI_LIST.some(k => k.key === item.kategori)) return item.kategori;
    const t = (item.tag || '').toLowerCase();
    if (t.includes('tahun')) return 'tahunan';
    if (t.includes('bulan')) return 'bulanan';
    if (t.includes('minggu') || t.includes('harian') || t.includes('hari') || t.includes('jumat') || t.includes('rutin')) return 'harian';
    return 'bulanan';
}

/* Render halaman Kegiatan lengkap dengan 3 tab kategori (Tahunan/Bulanan/Harian).
   Klik salah satu tab akan menampilkan kegiatan sesuai kategori tersebut. */
function renderActivityCardsByCategory(containerId, tabsId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const tabsEl = tabsId ? document.getElementById(tabsId) : document.getElementById(containerId + 'Tabs');
    let activeKategori = 'semua';

    const paintTabs = () => {
        if (!tabsEl) return;
        const semua = `<button type="button" class="kategori-tab-btn ${activeKategori === 'semua' ? 'active' : ''}" data-kategori="semua"><i class="fa-solid fa-layer-group"></i> Semua</button>`;
        const rest = ROHIS_KATEGORI_LIST.map(k => `<button type="button" class="kategori-tab-btn ${activeKategori === k.key ? 'active' : ''}" data-kategori="${k.key}"><i class="${k.icon}"></i> ${k.label}</button>`).join('');
        tabsEl.innerHTML = semua + rest;
        tabsEl.querySelectorAll('.kategori-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeKategori = btn.getAttribute('data-kategori');
                paintTabs();
                paintCards();
            });
        });
    };

    const paintCards = () => {
        const all = ROHIS.getActivities();
        const data = activeKategori === 'semua' ? all : all.filter(a => getKategoriKegiatan(a) === activeKategori);
        if (data.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada kegiatan untuk kategori ini.</div>';
            return;
        }
        el.innerHTML = data.map(a => `
            <div class="activity-card">
                <img src="${a.img}" class="activity-img" alt="${a.title}" onerror="this.src='assets/img/logo.jpg'">
                <div class="activity-body">
                    <span class="activity-tag">${a.tag}</span>
                    <h4>${a.title}</h4>
                    <p>${a.desc}</p>
                </div>
            </div>
        `).join('');
    };

    paintTabs();
    paintCards();
    _rohisAutoSync(el, 'activities', paintCards);
}

/* ================= RENDER KONTAK PENGURUS ================= */
function renderPengurusTable(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const paint = () => {
        const data = ROHIS.getPengurus();
        if (data.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada data pengurus.</div>';
            return;
        }
        el.innerHTML = `
            <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:400px;">
                <thead>
                    <tr style="background:var(--bg-site);text-align:left;">
                        <th style="padding:10px;">Nama Lengkap</th>
                        <th style="padding:10px;">Amanah Jabatan</th>
                        <th style="padding:10px;">Aksi Hubungi</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(p => `
                        <tr>
                            <td style="padding:10px;"><b>${p.nama}</b></td>
                            <td style="padding:10px;">${p.jabatan}</td>
                            <td style="padding:10px;"><a href="https://wa.me/${p.wa}" class="btn-wa" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat WA</a></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };
    paint();
    _rohisAutoSync(el, 'pengurus', paint);
}

/* ================= RENDER STRUKTUR PENGURUS (kartu, halaman Tentang) ================= */
function renderStrukturGrid(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const paint = () => {
        const data = ROHIS.getPengurus();
        if (data.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada data pengurus.</div>';
            return;
        }
        el.innerHTML = data.map((p, i) => `
            <div class="card struktur-card" style="animation-delay:${i * 70}ms">
                ${p.foto
                    ? `<img src="${p.foto}" class="struktur-avatar struktur-photo" alt="${p.nama}">`
                    : `<div class="struktur-avatar"><i class="fa-solid fa-user"></i></div>`}
                <h4>${p.nama}</h4>
                <span>${p.jabatan}</span>
            </div>
        `).join('');
    };
    paint();
    _rohisAutoSync(el, 'pengurus', paint);
}

/* ================= RENDER PEMBINA ROHIS (kartu, halaman Tentang) ================= */
function renderPembinaGrid(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const paint = () => {
        const data = ROHIS.getPembina();
        if (data.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada data pembina.</div>';
            return;
        }
        el.innerHTML = data.map((p, i) => `
            <div class="card pembina-card" style="animation-delay:${i * 70}ms">
                <span class="pembina-badge"><i class="fa-solid fa-star"></i> Pembina</span>
                ${p.foto
                    ? `<img src="${p.foto}" class="struktur-avatar pembina-photo" alt="${p.nama}">`
                    : `<div class="struktur-avatar"><i class="fa-solid fa-chalkboard-user"></i></div>`}
                <h4>${p.nama}</h4>
                <span>${p.jabatan}</span>
                ${p.keterangan ? `<p class="pembina-desc">${p.keterangan}</p>` : ''}
                ${p.wa ? `<a href="https://wa.me/${p.wa}" class="btn-wa" target="_blank" style="margin-top:10px;justify-content:center;"><i class="fa-brands fa-whatsapp"></i> Chat WA</a>` : ''}
            </div>
        `).join('');
    };
    paint();
    _rohisAutoSync(el, 'pembina', paint);
}

/* ================= UTIL: KOMPRES FOTO UPLOAD (dipakai admin panel) ================= */
/* Membaca file gambar, mengubah ukurannya (maks. sisi terpanjang) dan
   mengompresnya jadi base64 JPEG supaya hemat kuota Firestore/localStorage. */
function rohisReadImageCompressed(file, maxDim, quality, callback) {
    if (!file) { callback(null); return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
            let w = img.width, h = img.height;
            const dim = maxDim || 480;
            if (w > h && w > dim) { h = Math.round(h * (dim / w)); w = dim; }
            else if (h > dim) { w = Math.round(w * (dim / h)); h = dim; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            callback(canvas.toDataURL('image/jpeg', quality || 0.72));
        };
        img.onerror = function () { callback(null); };
        img.src = ev.target.result;
    };
    reader.onerror = function () { callback(null); };
    reader.readAsDataURL(file);
}

/* ================= BADGE STATUS SINKRONISASI (disuntik otomatis, tanpa edit HTML) ================= */
function injectSyncBadge() {
    if (document.getElementById('syncBadge')) return;
    const target = document.querySelector('.nav-right') || document.querySelector('.admin-topbar');
    if (!target) return;
    const badge = document.createElement('span');
    badge.id = 'syncBadge';
    badge.className = 'sync-badge sync-local';
    badge.title = 'Status sinkronisasi data';
    badge.innerHTML = '<span class="sync-dot"></span><span id="syncText">Memuat…</span>';
    if (target.classList.contains('nav-right')) target.insertBefore(badge, target.firstChild);
    else target.appendChild(badge);
}
function updateSyncBadge(status) {
    const badge = document.getElementById('syncBadge');
    if (!badge) return;
    const text = document.getElementById('syncText');
    const MAP = {
        online: { cls: 'sync-online', label: 'Tersinkron' },
        connecting: { cls: 'sync-connecting', label: 'Menyambungkan…' },
        offline: { cls: 'sync-offline', label: 'Offline (cache)' },
        local: { cls: 'sync-local', label: 'Mode Lokal' }
    };
    const s = MAP[status] || MAP.local;
    badge.className = 'sync-badge ' + s.cls;
    if (text) text.innerText = s.label;
}
document.addEventListener('DOMContentLoaded', function () {
    injectSyncBadge();
    updateSyncBadge(typeof ROHIS !== 'undefined' ? ROHIS.getConnectionStatus() : 'local');
});
window.addEventListener('rohis:connection', function (e) { updateSyncBadge(e.detail.status); });

/* ================= SCROLL REVEAL — sedikit animasi saat elemen masuk layar ================= */
function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const els = document.querySelectorAll('.panel-box, .section-heading, .prayer-container');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    els.forEach((el) => { el.classList.add('js-reveal'); obs.observe(el); });
}
document.addEventListener('DOMContentLoaded', initScrollReveal);

/* ================= EFEK RIPPLE PADA TOMBOL ================= */
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-action, .btn-secondary, .btn-outline, .btn-wa, .widget-btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-fx';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
});
