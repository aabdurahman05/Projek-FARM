<?php
// Fungsi bantu: koneksi database, JSON, sesi, upload gambar, notifikasi.
$CFG = require __DIR__ . '/config.php';
date_default_timezone_set('Asia/Jakarta');

session_name('FARMSESS');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function cfg($key)
{
    global $CFG;
    return isset($CFG[$key]) ? $CFG[$key] : null;
}

function db()
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . cfg('db_host') . ';port=' . cfg('db_port') . ';dbname=' . cfg('db_name') . ';charset=utf8mb4';
        $pdo = new PDO($dsn, cfg('db_user'), cfg('db_pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec("SET time_zone = '+07:00'");
    }
    return $pdo;
}

function rows($sql, $params = [])
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

function row($sql, $params = [])
{
    $r = rows($sql, $params);
    return $r ? $r[0] : null;
}

function val($sql, $params = [])
{
    $st = db()->prepare($sql);
    $st->execute($params);
    $v = $st->fetchColumn();
    return $v === false ? null : $v;
}

function run($sql, $params = [])
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return $st->rowCount();
}

function insert($sql, $params = [])
{
    $st = db()->prepare($sql);
    $st->execute($params);
    return (int) db()->lastInsertId();
}

function in_marks($list)
{
    return implode(',', array_fill(0, count($list), '?'));
}

function out($data, $code = 200)
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail($msg, $code = 400)
{
    out(['ok' => false, 'error' => $msg], $code);
}

function input()
{
    $raw = file_get_contents('php://input');
    $d = json_decode($raw === false || $raw === '' ? '[]' : $raw, true);
    return is_array($d) ? $d : [];
}

function str_in($in, $key, $max = 255)
{
    $v = isset($in[$key]) ? trim((string) $in[$key]) : '';
    return mb_substr($v, 0, $max);
}

function int_rows(&$list, $fields)
{
    foreach ($list as &$r) {
        foreach ($fields as $f) {
            if (array_key_exists($f, $r) && $r[$f] !== null) {
                $r[$f] = (int) $r[$f];
            }
        }
    }
    unset($r);
}

// ---------- sesi / peran ----------
function me()
{
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    if (empty($_SESSION['uid'])) {
        $cache = null;
        return null;
    }
    $u = row('SELECT id, role, nama, email, hp, alamat, pengalaman, foto FROM users WHERE id = ?', [(int) $_SESSION['uid']]);
    $cache = $u ? $u : null;
    if ($cache) {
        $cache['id'] = (int) $cache['id'];
    }
    return $cache;
}

function need_login()
{
    $u = me();
    if (!$u) {
        fail('Silakan masuk dulu.', 401);
    }
    return $u;
}

function need_role($role)
{
    $u = need_login();
    if ($u['role'] !== $role) {
        fail('Aksi ini hanya untuk ' . ($role === 'bos' ? 'bos tani' : 'petani') . '.', 403);
    }
    return $u;
}

function norm_hp($hp)
{
    return preg_replace('/[\s-]+/', '', (string) $hp);
}

// ---------- pembatasan percobaan (anti tebak sandi) ----------
function too_many($key)
{
    $n = val('SELECT COUNT(*) FROM percobaan_login WHERE identitas = ? AND waktu > ?', [$key, date('Y-m-d H:i:s', time() - 600)]);
    return (int) $n >= 5;
}

function note_fail($key)
{
    run('INSERT INTO percobaan_login (identitas, ip, waktu) VALUES (?, ?, ?)', [$key, isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '', date('Y-m-d H:i:s')]);
}

function clear_fail($key)
{
    run('DELETE FROM percobaan_login WHERE identitas = ?', [$key]);
}

// ---------- upload gambar (data URL dari browser) ----------
function save_image($dataUrl)
{
    if (!is_string($dataUrl) || !preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#', substr($dataUrl, 0, 40), $m)) {
        fail('Format gambar tidak valid.');
    }
    $b64 = substr($dataUrl, strlen($m[0]));
    if (strlen($b64) > cfg('max_upload') * 1.4) {
        fail('Ukuran gambar terlalu besar.');
    }
    $bin = base64_decode($b64, true);
    if ($bin === false || strlen($bin) === 0) {
        fail('Gambar rusak.');
    }
    if (strlen($bin) > cfg('max_upload')) {
        fail('Ukuran gambar terlalu besar.');
    }
    $info = @getimagesizefromstring($bin);
    $ext = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
    if (!$info || !isset($ext[$info['mime']])) {
        fail('File bukan gambar yang valid.');
    }
    $sub = 'uploads/' . date('Ym');
    $dir = dirname(__DIR__) . '/' . $sub;
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        fail('Folder uploads tidak bisa dibuat.', 500);
    }
    $name = bin2hex(random_bytes(12)) . '.' . $ext[$info['mime']];
    if (file_put_contents($dir . '/' . $name, $bin) === false) {
        fail('Gagal menyimpan gambar.', 500);
    }
    return $sub . '/' . $name;
}

function delete_upload($path)
{
    if (is_string($path) && strpos($path, 'uploads/') === 0 && strpos($path, '..') === false) {
        $f = dirname(__DIR__) . '/' . $path;
        if (is_file($f)) {
            @unlink($f);
        }
    }
}

// ---------- notifikasi (menghormati pengaturan pengguna) ----------
function notify_user($uid, $jenis, $teks)
{
    $pref = val('SELECT aktif FROM notif_prefs WHERE user_id = ? AND jenis = ?', [(int) $uid, $jenis]);
    if ($pref !== null && (int) $pref === 0) {
        return;
    }
    run('INSERT INTO notifikasi (user_id, jenis, teks) VALUES (?, ?, ?)', [(int) $uid, $jenis, mb_substr($teks, 0, 255)]);
}
