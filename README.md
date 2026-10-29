# FARM – Frontend + Backend PHP + Database MySQL (Laragon)

Aplikasi platform digital petani dan bos tani. Data tersimpan di **MySQL (phpMyAdmin)**, backend **PHP (PDO)**, frontend HTML/CSS/JavaScript.

## Cara menjalankan di Laragon

1. **Nyalakan Laragon** → klik *Start All* (Apache + MySQL harus hijau).
2. **Salin folder ini** ke `C:\laragon\www\farm` (hasil akhirnya: `C:\laragon\www\farm\index.html`).
3. **Import database**
   - Buka phpMyAdmin (klik kanan ikon Laragon → *MySQL* → *phpMyAdmin*, atau `http://localhost/phpmyadmin`).
   - Login: user `root`, kata sandi kosong.
   - Tab **Import** → pilih `database/farm_db.sql` → **Go**.
   - Database `farm_db` beserta 12 tabel dan data contoh akan terbentuk.
4. **Periksa instalasi**: buka `http://localhost/farm/api/health.php` — semua baris harus `[OK]`.
5. **Buka aplikasi**: `http://localhost/farm/` (landing page) → Masuk / Daftar.

### Akun contoh (kata sandi semuanya `farm12345`)
| Peran | Email | Keterangan |
|---|---|---|
| Petani | `petani@farm.id` | Andi, sedang mengerjakan lahan Pak Aab |
| Bos tani | `bos@farm.id` | Andi, punya 4 pelamar menunggu dan 1 pekerja berjalan |
| Petani lain | `budi@farm.id`, `dedi@farm.id`, `eko@farm.id`, `fajar@farm.id`, `rahmat@farm.id` | |
| Bos tani lain | `ripqi@farm.id`, `fajri@farm.id`, `aziz@farm.id`, `aab@farm.id` | |

Tip uji dua peran sekaligus: buka satu akun di jendela biasa dan akun lain di jendela *Incognito* (sesi login terpisah). Chat, lamaran, laporan, dan notifikasi saling masuk antar akun.

## Pengaturan
`api/config.php` — host/nama/user/kata sandi database (default Laragon: `127.0.0.1`, `farm_db`, `root`, kosong), `demo_social` (login Google/Facebook mode demo), `debug`.

## Struktur
```
index.html            Landing page
login.html            Masuk, daftar, lupa kata sandi
dashboard-petani.html Dashboard petani
dashboard-bos-tani.html Dashboard bos tani
css/  js/  assets/    Tampilan, logika, gambar
api/                  Backend PHP (index.php = router, h_*.php = handler, lib.php, config.php, health.php)
database/farm_db.sql  Skema + data contoh (untuk phpMyAdmin)
uploads/              Foto unggahan (laporan, chat, profil, lahan)
```

## Database (13 tabel)
`users` · `notif_prefs` · `lowongan` · `lowongan_tahap` · `lamaran` · `pekerjaan` · `laporan` · `laporan_foto` · `bagi_hasil` · `rating` · `pesan` · `notifikasi` · `percobaan_login`

Relasi utama: `lowongan.bos_id → users` · `lowongan_tahap.lowongan_id` (tahapan pekerjaan buatan bos tani) · `lamaran(lowongan, petani)` · `pekerjaan.lamaran_id → lamaran` (dibuat saat lamaran *Diterima*) · `laporan.pekerjaan_id` + `laporan_foto` · `bagi_hasil.pekerjaan_id` (satu per pekerjaan) · `rating(pekerjaan, dari, untuk)` · `pesan(dari, ke)`. Semua relasi memakai `ON DELETE CASCADE`.

## Alur bisnis yang dijaga server
1. Bos tani **posting lowongan** → petani **apply** → bos tani **terima/tolak** (konfirmasi) → jika diterima, **pekerjaan** dimulai.
2. Bos tani menentukan **tahapan pekerjaan** saat posting lowongan (1–8 tahap, mis. hanya "Pemanenan"). Petani **melapor progres** hanya untuk tahapan itu dengan **foto wajib** (1–3). Tahap tidak boleh mundur.
3. Setelah laporan **tahap terakhir**, bos tani **mencatat bagi hasil** (hanya bos tani/pemilik lahan; hitungan dilakukan di server) dan **menandai pekerjaan selesai**.
4. Persentase **bagi hasil** baru tampil setelah bos tani menyimpan hasil ke riwayat (sebelumnya 0% / strip).
5. **Rating** dua arah baru bisa diberikan **setelah pekerjaan selesai** (server menolak jika belum).

## Endpoint API (`api/index.php?r=...`)
GET: `boot`, `auth/me`, `chat/contacts`, `chat/thread&with=ID`, `rating/daftar&user=ID`
POST (JSON): `auth/register|login|logout|lupa_cek|lupa_reset|sosial`, `profil/update|foto|sandi|hapus|notif`, `lowongan/buat|hapus`, `lamaran/kirim|putus`, `kerja/laporan|selesai`, `bagi/simpan`, `chat/kirim`, `rating/kirim`, `notif/baca`

## Keamanan yang sudah ada
Kata sandi di-hash (`password_hash`/bcrypt) · semua query memakai prepared statement · sesi cookie HttpOnly + SameSite · header `X-Requested-With` wajib untuk POST (anti-CSRF dasar) · pembatasan 5 percobaan login/10 menit · validasi gambar (tipe, ukuran, `getimagesizefromstring`) dan folder `uploads/` tidak boleh menjalankan PHP · setiap aksi dicek kepemilikan dan perannya di server.

## Sebelum dipakai sungguhan (production)
- Ganti kata sandi akun contoh atau hapus datanya; ganti user/kata sandi MySQL (jangan `root` kosong).
- Set `demo_social` ke `false` (login Google/Facebook di sini hanya demo, bukan OAuth sungguhan).
- Pakai HTTPS (cookie `secure`) dan pastikan `debug` bernilai `false`.
- Lupa kata sandi memakai verifikasi email/No.Hp + nama lengkap karena belum ada server email.

## Masalah umum
- **"Tidak bisa terhubung ke server"** → Apache belum menyala, atau folder tidak berada di `www`.
- **`api/health.php` menulis Database [GAGAL]** → MySQL belum menyala atau `farm_db.sql` belum di-import; cek `api/config.php`.
- **Ekstensi `pdo_mysql`/`mbstring` tidak ada** → Laragon: klik kanan ikon → PHP → Extensions → centang.
- **Unggah foto gagal** → naikkan `post_max_size` di php.ini (Laragon: PHP → php.ini) jika foto sangat besar; foto otomatis dikecilkan di browser.
