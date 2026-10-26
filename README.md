# TV Nusantara — PWA Live TV Player

PWA statis untuk memutar channel dari playlist M3U/M3U8 yang legal dan dapat diakses. Tidak ada backend, database, akun, atau API key.

## Fitur
- Responsif untuk ponsel dan desktop; bisa dipasang sebagai PWA.
- Impor playlist dari URL atau file `.m3u` / `.m3u8`.
- Player HLS menggunakan hls.js, jika browser mendukungnya.
- Pencarian, kategori sederhana, dan favorit tersimpan lokal.
- EPG XMLTV melalui endpoint serverless `/api/epg`, dengan allowlist sumber, validasi XMLTV, timeout, batas ukuran, dan cache CDN.
- Bisa deploy ke Vercel, Netlify, atau GitHub Pages.

## Deploy paling mudah
1. Unduh ZIP dan ekstrak.
2. Buat repository GitHub baru lalu unggah seluruh isi folder ini (bukan folder ZIP-nya).
3. Di Vercel, pilih **Add New → Project**, impor repository tersebut.
4. Framework Preset pilih **Other**; Build Command kosong dan Output Directory `.` (atau biarkan Vercel mendeteksi static site).
5. Di Vercel, buka **Project → Settings → Environment Variables** dan tambahkan:
   - `EPG_SOURCE_URL`: URL HTTPS XMLTV yang memang Anda berhak akses.
   - `EPG_ALLOWED_HOSTS`: hostname persis yang diizinkan, tanpa protokol/path. Jika host URL adalah `epg.example.org`, isi `epg.example.org`. Beberapa host dipisahkan koma.
   Host pada `EPG_SOURCE_URL` wajib cocok persis dengan salah satu host dalam allowlist. Endpoint tidak menerima URL dari pengguna dan tidak meneruskan kredensial.
6. Redeploy setelah mengubah environment variables. Buka URL HTTPS hasil deploy dari Android Chrome, lalu pilih menu browser **Install app / Tambahkan ke layar utama**.

Alternatif: drag folder ke layanan static hosting yang mendukung deploy langsung.

## Cara pakai
1. Tekan **Sumber Channel**.
2. Tempel URL playlist M3U yang Anda punya izin untuk akses, atau unggah file lokal.
3. Pilih channel. EPG dimuat melalui `/api/epg`; browser tidak mengambil sumber XMLTV eksternal secara langsung.
4. Gunakan pencarian, filter, dan tombol bintang untuk favorit.

## Tentang playlist Indonesia
Tombol **Coba playlist Indonesia komunitas** memuat playlist komunitas `https://iptv-org.github.io/iptv/countries/id.m3u` sebagai contoh teknis. Ini bukan sertifikasi hak siar. Tautan dalam playlist dapat berubah, tidak aktif, dibatasi wilayah, memerlukan autentikasi, atau tidak mengizinkan playback di situs lain. Verifikasi hak dan sumber tiap stream sebelum digunakan; untuk penggunaan publik, utamakan URL resmi yang secara eksplisit mengizinkan embedding/redistribusi.

## Batasan teknis
- Browser tidak dapat memutar semua format. HLS `.m3u8` paling didukung; RTMP/RTSP biasanya tidak diputar langsung oleh browser.
- Stream lintas domain perlu mengizinkan CORS. Jangan mengakali autentikasi, DRM, geo-block, atau pembatasan akses.
- Autoplay dengan suara biasanya diblokir sampai pengguna menekan Play.
- Endpoint EPG Vercel hanya mengambil satu sumber yang ditentukan oleh `EPG_SOURCE_URL` dan dibatasi `EPG_ALLOWED_HOSTS`. Hanya HTTPS; redirect ditolak. Batas respons 5 MB, timeout 8 detik, validasi XML/XMLTV, dan cache CDN 5 menit.
- Frontend membedakan HTTP 404, kegagalan server HTTP 5xx, timeout, kegagalan jaringan, dan XML tidak valid. Jadwal hanya ditampilkan jika `tvg-id` playlist cocok persis dengan `channel id` XMLTV; jika tidak, jadwal dinyatakan tidak tersedia.
- Endpoint serverless membutuhkan deployment yang mendukung fungsi Node.js seperti Vercel. GitHub Pages atau hosting statis murni tidak menjalankan `/api/epg`; pada hosting tersebut endpoint akan gagal sampai fungsi dipasang di platform yang mendukungnya.
- Service worker meng-cache file aplikasi, bukan video stream. Offline hanya untuk shell aplikasi, bukan siaran langsung.
- Playlist eksternal dimuat saat diminta pengguna; aplikasi tidak menyertakan atau meng-host konten video.

## Lisensi
Source code aplikasi ini disediakan di bawah MIT License. Lisensi aplikasi tidak memberikan hak atas siaran pihak ketiga atau playlist eksternal.


### Default channel Indonesia

Saat aplikasi dibuka, frontend mencoba memuat playlist komunitas Indonesia `https://iptv-org.github.io/iptv/countries/id.m3u` secara otomatis. Ini sumber komunitas, bukan jaminan bahwa setiap stream resmi, aktif, atau tersedia di semua wilayah. Gunakan sumber yang hak aksesnya kamu miliki; channel yang tidak tersedia dapat gagal diputar. Pengguna tetap dapat mengganti playlist lewat pengaturan sumber.
