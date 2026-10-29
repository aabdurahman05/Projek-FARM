<?php
// Buka http://localhost/farm/api/health.php untuk memeriksa PHP, ekstensi, database, dan folder uploads.
header('Content-Type: text/plain; charset=utf-8');
$cfg = require __DIR__ . '/config.php';
echo "PHP " . PHP_VERSION . (version_compare(PHP_VERSION, '7.4.0', '>=') ? "  [OK]\n" : "  [PERLU PHP 7.4+]\n");
foreach (['pdo_mysql', 'mbstring', 'json', 'fileinfo', 'gd'] as $ext) {
    echo str_pad($ext, 12) . (extension_loaded($ext) ? "[OK]\n" : ($ext === 'gd' || $ext === 'fileinfo' ? "[opsional]\n" : "[TIDAK ADA - aktifkan di php.ini]\n"));
}
try {
    $pdo = new PDO('mysql:host=' . $cfg['db_host'] . ';port=' . $cfg['db_port'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4', $cfg['db_user'], $cfg['db_pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $n = $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    echo "Database    [OK] terhubung ke {$cfg['db_name']}, jumlah user: $n\n";
} catch (Throwable $e) {
    echo "Database    [GAGAL] " . $e->getMessage() . "\n  -> Pastikan MySQL Laragon menyala dan farm_db.sql sudah di-import lewat phpMyAdmin.\n";
}
$up = dirname(__DIR__) . '/uploads';
echo "uploads/    " . (is_dir($up) && is_writable($up) ? "[OK] bisa ditulis\n" : "[GAGAL] folder tidak ada / tidak bisa ditulis\n");
