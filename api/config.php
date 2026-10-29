<?php
// Pengaturan koneksi. Default Laragon: user "root" tanpa kata sandi.
return [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'farm_db',
    'db_user' => 'root',
    'db_pass' => '',

    // Tombol Google/Facebook di halaman login berjalan dalam MODE DEMO (tanpa OAuth sungguhan).
    // Ubah ke false untuk menonaktifkannya saat aplikasi dipakai sungguhan.
    'demo_social' => true,

    // true = tampilkan pesan error asli di respons API (hanya untuk belajar/debug).
    'debug' => false,

    // Batas ukuran satu gambar upload (byte).
    'max_upload' => 3 * 1024 * 1024,
];
