# Perbaikan deployment GitHub Pages untuk cobadoang2

Repo ini adalah proyek Vite. Jangan publish source folder langsung dari branch root. Vite harus membangun `dist/` agar:
- dependency npm (`qrcode`, `qr-scanner`) dibundel;
- manifest dari `public/manifest.webmanifest` disalin ke root output;
- icon dan `sw.js` disalin ke root output;
- `import.meta.env.BASE_URL` diproses saat build.

## Langkah
1. Salin/merge isi proyek ini ke root repository `fernandyoung/cobadoang2` (jangan taruh di dalam subfolder `pwa-tracker-p2p`).
2. Pastikan `.github/workflows/deploy.yml` ikut ter-commit.
3. GitHub → repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. Commit dan push ke branch `main`.
5. Buka Actions dan tunggu workflow **Deploy PWA to GitHub Pages** hijau.
6. Buka `https://fernandyoung.github.io/cobadoang2/`, lalu hard reload (Ctrl+Shift+R).

## Verifikasi
Setelah workflow sukses, URL berikut harus berstatus HTTP 200:
- `/cobadoang2/manifest.webmanifest`
- `/cobadoang2/sw.js`
- `/cobadoang2/icon-192.png`
- `/cobadoang2/icon-512.png`

Manifest menggunakan `start_url: "./"` dan `scope: "./"` yang sesuai untuk project site di `/cobadoang2/`. Jangan mengubah ke `/` karena itu akan menunjuk ke root domain, bukan ke aplikasi ini.
