# Panduan Mengaktifkan Sinkronisasi Data Antar Perangkat

Website ROHIS ini sekarang mendukung **sinkronisasi data realtime** memakai
Firebase Firestore (gratis). Setelah diaktifkan, apa pun yang diubah dari
Admin Panel — di HP, laptop, atau browser mana pun — akan langsung muncul
di semua perangkat lain yang membuka situs ini, tanpa perlu refresh manual.

Tanpa langkah di bawah, situs **tetap berjalan normal** seperti sebelumnya
(data hanya tersimpan di browser masing-masing perangkat / localStorage).
Jadi tidak ada risiko situs rusak jika langkah ini dilewati.

---

## 1. Buat Project Firebase (gratis, ±3 menit)

1. Buka **https://console.firebase.google.com**
2. Login dengan akun Google, klik **"Add project" / "Tambah project"**.
3. Beri nama misalnya `rohis-yatpi-godong`, lanjutkan (Google Analytics
   boleh dimatikan, tidak wajib).
4. Tunggu sampai project selesai dibuat.

## 2. Aktifkan Firestore Database

1. Di sidebar kiri, buka menu **Build > Firestore Database**.
2. Klik **"Create database"**.
3. Pilih **"Start in production mode"**, lalu pilih lokasi server terdekat
   (misalnya `asia-southeast2 (Jakarta)`), klik **Enable**.

## 3. Atur Aturan Keamanan (Security Rules)

1. Masih di halaman Firestore Database, buka tab **"Rules"**.
2. Ganti isinya dengan kode berikut, lalu klik **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rohis_public/{docId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> Catatan: aturan ini membuka akses baca/tulis publik pada koleksi
> `rohis_public` saja (sesuai desain situs ini yang memakai proteksi kata
> sandi sisi-klien, bukan login server). Untuk keamanan lebih tinggi di
> masa depan, aturan ini bisa dikembangkan dengan Firebase Authentication.

## 4. Daftarkan Web App & Ambil Konfigurasi

1. Klik ikon **gear ⚙️ (Project settings)** di sidebar kiri atas.
2. Scroll ke bagian **"Your apps"**, klik ikon web **`</>`**.
3. Beri nama app, misalnya `rohis-website`, klik **"Register app"**.
4. Firebase akan menampilkan kode `firebaseConfig` seperti ini:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "rohis-yatpi-godong.firebaseapp.com",
  projectId: "rohis-yatpi-godong",
  storageBucket: "rohis-yatpi-godong.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. Copy nilai-nilai tersebut.

## 5. Tempel ke File Website

1. Buka file **`assets/js/firebase-config.js`** di folder website Anda.
2. Ganti isinya menjadi seperti ini (sesuaikan dengan nilai Anda sendiri):

```js
window.ROHIS_FIREBASE_CONFIG = {
    apiKey: "AIzaSy...",
    authDomain: "rohis-yatpi-godong.firebaseapp.com",
    projectId: "rohis-yatpi-godong",
    storageBucket: "rohis-yatpi-godong.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

3. Simpan file, lalu upload ulang seluruh folder website ke hosting Anda
   (atau replace file itu saja jika hosting mendukung edit langsung).

## 6. Selesai — Cek Statusnya

Buka situs Anda, lihat pojok kanan atas (di navbar / topbar admin):

- 🟢 **Tersinkron** — cloud aktif, data sinkron realtime ke semua perangkat.
- 🟡 **Menyambungkan…** — sedang menyambung ke Firestore.
- 🟠 **Offline (cache)** — sedang tidak ada koneksi internet, memakai data
  cache terakhir; akan otomatis sinkron lagi saat online.
- ⚪ **Mode Lokal** — konfigurasi belum diisi / gagal tersambung, situs
  berjalan seperti versi lokal (localStorage per-perangkat).

Coba tambah satu kegiatan lewat Admin Panel di satu perangkat, lalu buka
situs di perangkat lain (atau HP) — data seharusnya langsung muncul tanpa
perlu refresh.

## Batas Pemakaian Gratis

Firestore memiliki kuota gratis (Spark Plan) yang sangat cukup untuk situs
organisasi sekolah seperti ini: 50.000 pembacaan & 20.000 penulisan data
per hari, serta 1 GiB penyimpanan. Situs ROHIS ini jauh di bawah batas
tersebut dalam pemakaian normal sehari-hari.
