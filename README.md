# InBody OCR Tracker

Aplikasi PWA (*Progressive Web App*) untuk mencatat dan melacak hasil tes komposisi tubuh (InBody) dari gym tiap bulan. Data 100% aman karena tersimpan lokal di perangkat pengguna.

## Fitur Utama
- **Auto-Scan via OCR:** Ekstrak data otomatis dari foto/screenshot laporan InBody menggunakan `Tesseract.js`. 
- **Visualisasi 4-Compartment:** Ilusi grafis proporsi tubuh (Lemak, Air, Protein, Mineral) yang menyesuaikan gender profil.
- **Grafik Tren:** Pantau progres berat, otot, lemak, persentase body fat (PBF), BMI, hingga usia fisik.
- **Offline First:** Data tersimpan lokal di HP via `IndexedDB`. Tidak butuh server/database eksternal.
- **Backup:** Tersedia fitur Export/Import data dalam format `.json`.

## Instalasi & Hosting (Wajib HTTPS)
Agar fitur **Kamera** dan **PWA (Add to Home Screen)** berfungsi, aplikasi ini **harus di-host menggunakan HTTPS** (tidak bisa dari `file://` lokal).

1. Host folder ini secara gratis di **GitHub Pages**, **Netlify**, atau **Vercel**.
2. Buka link web-nya melalui browser HP (Chrome untuk Android, Safari untuk iPhone).
3. Pilih menu **Share / Menu (⋮)** → **"Add to Home Screen"**.
4. Buka aplikasi dari layar utama HP kamu layaknya aplikasi *native* (tanpa *address bar*).

## Tips Penggunaan OCR
- Barcode QR di struk InBody biasanya hanya berisi *link* web. Cara terbaik: **Scan QR -> Buka Link -> Screenshot laporan webnya -> Upload screenshot tersebut ke aplikasi ini.**
- Meskipun menggunakan OCR, **selalu cek dan koreksi ulang angka** di dalam *form review* sebelum menekan tombol simpan, karena OCR sesekali bisa salah membaca karakter pada tata letak struk yang rumit.

## Struktur Folder
- `index.html` : Tampilan utama aplikasi.
- `css/` : Gaya dan layout (*styling*).
- `js/app.js` : Logika utama (navigasi, kamera, form).
- `js/ocr-parse.js` : Mengolah raw teks Tesseract menjadi data terstruktur.
- `js/db.js` : Pengelolaan database lokal (IndexedDB).
- `js/charts.js` : Render grafik tren menggunakan Chart.js.
- `manifest.json` & `sw.js` : File konfigurasi PWA agar bisa di-install & jalan offline.
