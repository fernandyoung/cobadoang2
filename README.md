# PWA Tracker — P2P Sync (GitHub Pages)

Demo PWA tracker teks dengan LocalStorage, WebRTC DataChannel, QR pairing, dan Smart Merge sederhana. Tidak menggunakan backend, database cloud, atau signaling server.

## Deploy ke GitHub Pages

1. Buat repository GitHub baru.
2. Upload seluruh isi folder proyek ini ke root repository (pastikan `package.json`, `index.html`, `vite.config.js`, `src/`, `public/`, dan `.github/` berada di root).
3. Commit dan push ke branch `main`.
4. Buka **Settings → Pages** pada repository.
5. Pada **Build and deployment**, pilih **GitHub Actions**.
6. Buka tab **Actions** dan tunggu workflow **Deploy PWA to GitHub Pages** selesai.
7. Buka URL GitHub yang diberikan, biasanya `https://USERNAME.github.io/NAMA-REPOSITORY/`.

Workflow di `.github/workflows/deploy.yml` membangun dan menerbitkan aplikasi setiap ada push ke `main`.

## Install di setiap perangkat

- Buka URL GitHub Pages yang sama di browser masing-masing perangkat.
- Android/Chrome: menu browser → **Install app** atau **Add to Home screen**.
- Desktop/Chrome/Edge: ikon install di address bar atau menu browser → **Install page as app**.
- iPhone/iPad: Safari → tombol Share → **Add to Home Screen**.
- Setelah pertama kali dimuat dan service worker aktif, app shell dapat dibuka offline. Pairing dan transfer tetap membutuhkan kedua perangkat aktif pada saat yang sama.

Data LocalStorage bersifat per-browser/per-origin. Semua perangkat mempunyai database lokal masing-masing; data tidak otomatis dibagikan hanya karena aplikasi dipasang.

## Pairing dan sinkronisasi tanpa backend

1. Kedua perangkat membuka aplikasi.
2. Perangkat A pilih **Create Pairing (Offer)** dan tampilkan QR.
3. Perangkat B pilih **Scan QR**, pindai Offer, lalu pilih **Accept Offer → Create Answer**.
4. Perangkat B menampilkan QR Answer.
5. Perangkat A pindai QR Answer, lalu pilih **Accept Answer**.
6. Tunggu status WebRTC terhubung, lalu tekan **Sync Now**.

Jika kamera tidak tersedia, payload bisa dipindahkan dengan copy/paste. QR SDP dapat padat; copy/paste mungkin lebih mudah untuk beberapa perangkat.

## Batasan koneksi yang penting

- GitHub Pages hanya menjadi hosting file statis PWA; bukan server sinkronisasi.
- Tidak ada signaling server, STUN, atau TURN di starter ini. Koneksi paling sesuai untuk dua perangkat pada LAN/Wi-Fi yang mengizinkan koneksi peer-to-peer.
- Beda Wi-Fi/internet tidak dijamin berhasil tanpa jalur jaringan langsung. Untuk melewati NAT/firewall secara andal biasanya diperlukan STUN dan kadang TURN; TURN membutuhkan relay server sehingga tidak lagi sepenuhnya tanpa infrastruktur.
- WebRTC DataChannel mengenkripsi transport, tetapi pairing QR harus dilakukan hanya dengan perangkat yang dipercaya.
- LocalStorage cocok untuk data tracker teks yang kecil. Kuota browser terbatas dan penyimpanan tidak transaksional. Jangan gunakan untuk data yang tidak boleh hilang tanpa menambahkan backup/export.
- Starter ini mengirim operation log saat Sync Now. Konflik record yang sama diselesaikan dengan deterministic last-write-wins berbasis clock dan device ID; belum melakukan merge per-field.
- Browser/PWA tidak menjamin proses sync berjalan ketika aplikasi ditutup. Kedua perangkat harus membuka aplikasi saat sinkronisasi.

## Pengembangan lokal

```bash
npm install
npm run dev
```

Untuk uji kamera di perangkat lain gunakan URL HTTPS. `localhost` dianggap secure context, sedangkan HTTP melalui IP LAN umumnya tidak.

## Integrasi ke tracker yang sudah ada

Starter ini adalah demo terpisah. Sebelum menggabungkan dengan aplikasi tracker utama:
- backup data LocalStorage lama;
- sesuaikan nama key dan skema record;
- arahkan semua create/update/delete melalui fungsi store agar operation log tercatat;
- jangan menghapus record secara fisik; gunakan tombstone untuk sinkronisasi penghapusan;
- uji dua perangkat dan konflik sebelum dipakai untuk data penting.
