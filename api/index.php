<?php
// Pintu masuk API. Contoh: api/index.php?r=auth/login  (POST JSON)
require __DIR__ . '/lib.php';
foreach (['auth', 'profil', 'lowongan', 'kerja', 'sosial', 'boot'] as $f) {
    require __DIR__ . '/h_' . $f . '.php';
}

$r = isset($_GET['r']) ? (string) $_GET['r'] : '';
$getRoutes = ['boot', 'auth/me', 'chat/contacts', 'chat/thread', 'rating/daftar'];
$postRoutes = ['auth/register', 'auth/login', 'auth/logout', 'auth/lupa_cek', 'auth/lupa_reset', 'auth/sosial',
    'profil/update', 'profil/foto', 'profil/sandi', 'profil/hapus', 'profil/notif',
    'lowongan/buat', 'lowongan/hapus', 'lamaran/kirim', 'lamaran/putus',
    'kerja/laporan', 'kerja/selesai', 'bagi/simpan', 'chat/kirim', 'rating/kirim', 'notif/baca'];

$isGet = in_array($r, $getRoutes, true);
if (!$isGet && !in_array($r, $postRoutes, true)) {
    fail('Endpoint tidak ditemukan.', 404);
}
if ($isGet && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    fail('Gunakan metode GET.', 405);
}
if (!$isGet) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail('Gunakan metode POST.', 405);
    }
    // Perlindungan CSRF sederhana: header khusus ini tidak bisa dikirim form lintas situs.
    if (!isset($_SERVER['HTTP_X_REQUESTED_WITH']) || $_SERVER['HTTP_X_REQUESTED_WITH'] !== 'fetch') {
        fail('Permintaan ditolak.', 403);
    }
}

$fn = 'h_' . str_replace('/', '_', $r);
try {
    $fn();
} catch (Throwable $e) {
    error_log('[FARM] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    fail(cfg('debug') ? $e->getMessage() : 'Terjadi kesalahan server.', 500);
}
