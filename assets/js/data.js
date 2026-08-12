/* =========================================================================
   ROHIS DATA LAYER — localStorage cache + sinkronisasi cloud (Firestore)
   -------------------------------------------------------------------------
   Situs ini tetap berjalan sebagai situs statis, tapi kini seluruh data
   konten (kegiatan, pengurus, pembina, aspirasi, jurnal, kata sandi admin)
   DISINKRONKAN secara realtime lewat Firebase Firestore jika sudah
   dikonfigurasi (lihat assets/js/firebase-config.js).

   Jika konfigurasi Firebase belum diisi / gagal tersambung, ROHIS otomatis
   berjalan dalam "Mode Lokal" persis seperti versi sebelumnya (data hanya
   tersimpan di localStorage perangkat itu sendiri) — situs tidak akan rusak.

   Pola pakai di seluruh halaman TIDAK BERUBAH: ROHIS.getActivities(),
   ROHIS.addActivity(), dst tetap sama & tetap sinkron (membaca dari cache
   lokal yang selalu diperbarui otomatis oleh listener realtime Firestore).
   Setiap kali data baru datang (dari perangkat mana pun), event
   'rohis:sync' ditembakkan ke window supaya semua tampilan ikut refresh.
   Status koneksi disiarkan lewat event 'rohis:connection'.
   ========================================================================= */

const ROHIS = {
    KEYS: {
        ACTIVITIES: 'rohis_activities_v1',
        PENGURUS: 'rohis_pengurus_v1',
        PEMBINA: 'rohis_pembina_v1',
        ASPIRASI: 'rohis_aspirasi_v1',
        JURNAL: 'rohis_jurnal_v1',
        ADMIN_PASS: 'rohis_admin_pass_v1',
        ADMIN_SESSION: 'rohis_admin_session_v1'
    },

    /* Peta nama-cache internal ke nama dokumen Firestore */
    DOC_MAP: {
        ACTIVITIES: 'activities',
        PENGURUS: 'pengurus',
        PEMBINA: 'pembina',
        ASPIRASI: 'aspirasi',
        JURNAL: 'jurnal'
    },

    _cache: {},
    _cloud: false,
    _db: null,
    _connStatus: 'local',

    _get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    },
    _set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    },
    _id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },

    _emit(name, detail) {
        try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) { /* no-op */ }
    },
    _setConnectionStatus(status) {
        if (this._connStatus === status) return;
        this._connStatus = status;
        this._emit('rohis:connection', { status });
    },
    getConnectionStatus() { return this._connStatus; },

    /* ---------------- SEED DEFAULTS (hanya jika kosong) ---------------- */
    init() {
        if (!localStorage.getItem(this.KEYS.ACTIVITIES)) {
            this._set(this.KEYS.ACTIVITIES, [
                { id: this._id(), img: 'assets/img/foto1.jpg', tag: 'Rutin Jumat Wage', title: 'Istighosah Akbar & Doa Tolak Bala', desc: 'Majelis munajat spiritual bulanan yang diikuti oleh seluruh guru, karyawan, dan siswa demi keselamatan dunia dan akhirat.' },
                { id: this._id(), img: 'assets/img/foto2.jpg', tag: 'Tahunan', title: 'Gema Resolusi Jihad Hari Santri', desc: 'Penyelenggaraan pawai obor religi, upacara sakral adat sarungan, serta perlombaan baca kitab kuning antar kelas.' },
                { id: this._id(), img: 'assets/img/foto3.jpg', tag: 'Mingguan', title: 'Kajian Fiqih Kontemporer Remaja', desc: 'Pembahasan kritis interaktif mengenai etika bermedia sosial, tata cara ibadah yang valid, dan pembentukan moralitas.' }
            ]);
        }
        if (!localStorage.getItem(this.KEYS.PENGURUS)) {
            this._set(this.KEYS.PENGURUS, [
                { id: this._id(), nama: 'Ely Tri Rahayuningsih', jabatan: 'Lurah Rohis', wa: '62895322090541' },
                { id: this._id(), nama: 'Dwi Oktavianai', jabatan: 'Ketua 2', wa: '6289621412600' }
            ]);
        }
        if (!localStorage.getItem(this.KEYS.PEMBINA)) {
            this._set(this.KEYS.PEMBINA, [
                { id: this._id(), nama: 'Ahmad Fauzi, S.Pd.I', jabatan: 'Pembina Utama ROHIS', keterangan: 'Guru Pendidikan Agama Islam', wa: '' },
                { id: this._id(), nama: 'Siti Nur Halimah, S.Pd', jabatan: 'Pembina Kesiswaan', keterangan: 'Wakil Kepala Bidang Kesiswaan', wa: '' }
            ]);
        }
        if (!localStorage.getItem(this.KEYS.ASPIRASI)) this._set(this.KEYS.ASPIRASI, []);
        if (!localStorage.getItem(this.KEYS.JURNAL)) this._set(this.KEYS.JURNAL, []);
        if (!localStorage.getItem(this.KEYS.ADMIN_PASS)) this._set(this.KEYS.ADMIN_PASS, 'rohis2026');

        /* Isi cache awal dari localStorage supaya tampilan langsung terisi
           (tidak kosong) sebelum data realtime dari cloud tiba. */
        this._cache.ACTIVITIES = this._get(this.KEYS.ACTIVITIES, []);
        this._cache.PENGURUS = this._get(this.KEYS.PENGURUS, []);
        this._cache.PEMBINA = this._get(this.KEYS.PEMBINA, []);
        this._cache.ASPIRASI = this._get(this.KEYS.ASPIRASI, []);
        this._cache.JURNAL = this._get(this.KEYS.JURNAL, []);

        this._initCloud();
    },

    /* ---------------- SINKRONISASI CLOUD (FIRESTORE) ---------------- */
    _initCloud() {
        const cfg = window.ROHIS_FIREBASE_CONFIG;
        const belumDiisi = !cfg || !cfg.apiKey || /GANTI_DENGAN/.test(cfg.apiKey);
        if (belumDiisi || typeof firebase === 'undefined') {
            this._setConnectionStatus('local');
            return;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
            this._db = firebase.firestore();
            try { this._db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) { /* browser lama, abaikan */ }
            this._cloud = true;
            this._setConnectionStatus('connecting');

            Object.keys(this.DOC_MAP).forEach((cacheKey) => {
                const docName = this.DOC_MAP[cacheKey];
                this._db.collection('rohis_public').doc(docName).onSnapshot(
                    { includeMetadataChanges: true },
                    (snap) => {
                        const items = snap.exists && Array.isArray(snap.data().items) ? snap.data().items : [];
                        this._cache[cacheKey] = items;
                        this._set(this.KEYS[cacheKey], items);
                        this._setConnectionStatus(snap.metadata.fromCache ? 'offline' : 'online');
                        this._emit('rohis:sync', { key: docName });
                    },
                    () => { this._setConnectionStatus('offline'); }
                );
            });

            /* Kata sandi admin ikut disinkronkan lewat dokumen "settings" */
            this._db.collection('rohis_public').doc('settings').onSnapshot(
                { includeMetadataChanges: true },
                (snap) => {
                    if (snap.exists && snap.data().adminPass) {
                        this._set(this.KEYS.ADMIN_PASS, snap.data().adminPass);
                    } else {
                        this._db.collection('rohis_public').doc('settings')
                            .set({ adminPass: this._get(this.KEYS.ADMIN_PASS, 'rohis2026') }, { merge: true })
                            .catch(() => {});
                    }
                    this._emit('rohis:sync', { key: 'settings' });
                },
                () => {}
            );
        } catch (e) {
            console.error('ROHIS: gagal menyambungkan Firebase, memakai mode lokal.', e);
            this._cloud = false;
            this._setConnectionStatus('local');
        }
    },

    /* Menulis satu koleksi (array penuh) ke cache lokal + cloud, lalu
       menyiarkan event supaya seluruh tampilan yang terbuka ikut refresh. */
    _writeCollection(cacheKey, arr) {
        this._cache[cacheKey] = arr;
        this._set(this.KEYS[cacheKey], arr);
        this._emit('rohis:sync', { key: this.DOC_MAP[cacheKey] });
        if (this._cloud && this._db) {
            const payload = { items: arr };
            try { payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp(); } catch (e) {}
            this._db.collection('rohis_public').doc(this.DOC_MAP[cacheKey]).set(payload)
                .catch((err) => console.error('ROHIS: gagal sinkron ke cloud (' + cacheKey + ')', err));
        }
        return true;
    },

    /* ---------------- ACTIVITIES ---------------- */
    getActivities() { return this._cache.ACTIVITIES || this._get(this.KEYS.ACTIVITIES, []); },
    saveActivities(arr) { return this._writeCollection('ACTIVITIES', arr); },
    addActivity(item) {
        const arr = [{ id: this._id(), ...item }, ...this.getActivities()];
        return this.saveActivities(arr);
    },
    updateActivity(id, item) {
        return this.saveActivities(this.getActivities().map(a => a.id === id ? { ...a, ...item } : a));
    },
    deleteActivity(id) {
        return this.saveActivities(this.getActivities().filter(a => a.id !== id));
    },

    /* ---------------- PENGURUS ---------------- */
    getPengurus() { return this._cache.PENGURUS || this._get(this.KEYS.PENGURUS, []); },
    savePengurus(arr) { return this._writeCollection('PENGURUS', arr); },
    addPengurus(item) {
        return this.savePengurus([...this.getPengurus(), { id: this._id(), ...item }]);
    },
    deletePengurus(id) {
        return this.savePengurus(this.getPengurus().filter(p => p.id !== id));
    },
    updatePengurus(id, item) {
        return this.savePengurus(this.getPengurus().map(p => p.id === id ? { ...p, ...item } : p));
    },

    /* ---------------- PEMBINA ROHIS ---------------- */
    getPembina() { return this._cache.PEMBINA || this._get(this.KEYS.PEMBINA, []); },
    savePembina(arr) { return this._writeCollection('PEMBINA', arr); },
    addPembina(item) {
        return this.savePembina([...this.getPembina(), { id: this._id(), ...item }]);
    },
    updatePembina(id, item) {
        return this.savePembina(this.getPembina().map(p => p.id === id ? { ...p, ...item } : p));
    },
    deletePembina(id) {
        return this.savePembina(this.getPembina().filter(p => p.id !== id));
    },

    /* ---------------- ASPIRASI ---------------- */
    getAspirasi() { return this._cache.ASPIRASI || this._get(this.KEYS.ASPIRASI, []); },
    addAspirasi(item) {
        const arr = [...this.getAspirasi(), { id: this._id(), waktu: new Date().toLocaleString('id-ID'), dibaca: false, ...item }];
        return this._writeCollection('ASPIRASI', arr);
    },
    markAspirasiRead(id) {
        return this._writeCollection('ASPIRASI', this.getAspirasi().map(a => a.id === id ? { ...a, dibaca: true } : a));
    },
    deleteAspirasi(id) {
        return this._writeCollection('ASPIRASI', this.getAspirasi().filter(a => a.id !== id));
    },
    clearAspirasi() { return this._writeCollection('ASPIRASI', []); },

    /* ---------------- JURNAL YAUMI ---------------- */
    getJurnal() { return this._cache.JURNAL || this._get(this.KEYS.JURNAL, []); },
    addJurnal(item) {
        return this._writeCollection('JURNAL', [...this.getJurnal(), { id: this._id(), ...item }]);
    },
    deleteJurnal(id) {
        return this._writeCollection('JURNAL', this.getJurnal().filter(j => j.id !== id));
    },
    clearJurnal() { return this._writeCollection('JURNAL', []); },

    /* ---------------- ADMIN AUTH (proteksi ringan sisi-klien) ---------------- */
    auth: {
        checkPassword(pw) { return pw === ROHIS._get(ROHIS.KEYS.ADMIN_PASS, 'rohis2026'); },
        setPassword(pw) {
            ROHIS._set(ROHIS.KEYS.ADMIN_PASS, pw);
            if (ROHIS._cloud && ROHIS._db) {
                ROHIS._db.collection('rohis_public').doc('settings').set({ adminPass: pw }, { merge: true })
                    .catch((err) => console.error('ROHIS: gagal sinkron kata sandi ke cloud', err));
            }
            return true;
        },
        login() { sessionStorage.setItem(ROHIS.KEYS.ADMIN_SESSION, '1'); },
        logout() { sessionStorage.removeItem(ROHIS.KEYS.ADMIN_SESSION); },
        isLoggedIn() { return sessionStorage.getItem(ROHIS.KEYS.ADMIN_SESSION) === '1'; }
    }
};

ROHIS.init();
