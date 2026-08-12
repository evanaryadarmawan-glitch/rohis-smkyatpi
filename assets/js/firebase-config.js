/* =========================================================================
   KONFIGURASI FIREBASE — ISI DI SINI AGAR DATA SINKRON ANTAR PERANGKAT
   =========================================================================
   Tanpa langkah ini, website TETAP BISA JALAN NORMAL seperti sebelumnya
   (data tersimpan per-perangkat / localStorage saja, seperti versi lama).

   Cara mengaktifkan sinkronisasi cloud (gratis, ±5 menit), baca panduan
   lengkap di file SINKRONISASI-DATA.md pada folder utama proyek ini.

   Ringkasannya:
   1. Buka https://console.firebase.google.com lalu buat project baru (gratis).
   2. Di project itu, aktifkan "Firestore Database" (mode production).
   3. Buka menu Project settings > General > "Your apps" > pilih ikon Web (</>)
      untuk mendaftarkan web app, lalu copy object firebaseConfig yang muncul.
   4. Tempel (paste) object tersebut menggantikan nilai contoh di bawah ini.
   5. Simpan file ini, lalu upload ulang seluruh folder website Anda.
   ========================================================================= */

window.ROHIS_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDR2ibBtIq0dglCtOx7LLk_4qL4aitTzHs",
  authDomain: "rohis-smk-yatpi-godong.firebaseapp.com",
  databaseURL: "https://rohis-smk-yatpi-godong-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rohis-smk-yatpi-godong",
  storageBucket: "rohis-smk-yatpi-godong.firebasestorage.app",
  messagingSenderId: "870979375572",
  appId: "1:870979375572:web:6bd246d476b808e8320641",
  measurementId: "G-XQ27R98QJC"
};
