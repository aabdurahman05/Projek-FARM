<?php
function public_user($u)
{
    return [
        'id' => (int) $u['id'], 'role' => $u['role'], 'nama' => $u['nama'], 'email' => $u['email'],
        'hp' => $u['hp'], 'alamat' => $u['alamat'], 'pengalaman' => $u['pengalaman'], 'foto' => $u['foto'],
    ];
}

function h_auth_register()
{
    $in = input();
    $role = isset($in['role']) ? $in['role'] : '';
    $nama = str_in($in, 'nama', 100);
    $email = strtolower(str_in($in, 'email', 150));
    $hp = norm_hp(str_in($in, 'hp', 30));
    $pw = isset($in['password']) ? (string) $in['password'] : '';
    if (!in_array($role, ['petani', 'bos'], true)) fail('Peran tidak valid.');
    if (mb_strlen($nama) < 2) fail('Nama lengkap minimal 2 karakter.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Format email belum benar.');
    if (!preg_match('/^\+?[0-9]{8,15}$/', $hp)) fail('Nomor HP belum benar.');
    if (strlen($pw) < 8) fail('Kata sandi minimal 8 karakter.');
    $ada = val('SELECT COUNT(*) FROM users WHERE role = ? AND (email = ? OR hp = ?)', [$role, $email, $hp]);
    if ((int) $ada > 0) fail('Email atau No.Hp sudah terdaftar untuk peran ini.', 409);
    $id = insert('INSERT INTO users (role, nama, email, hp, password_hash) VALUES (?, ?, ?, ?, ?)', [$role, $nama, $email, $hp, password_hash($pw, PASSWORD_DEFAULT)]);
    out(['ok' => true, 'id' => $id]);
}

function h_auth_login()
{
    $in = input();
    $role = isset($in['role']) ? $in['role'] : '';
    $idv = strtolower(str_in($in, 'id', 150));
    $pw = isset($in['password']) ? (string) $in['password'] : '';
    if (!in_array($role, ['petani', 'bos'], true) || $idv === '' || $pw === '') fail('Email/No.Hp dan kata sandi wajib diisi.');
    $key = 'login:' . $role . ':' . $idv;
    if (too_many($key)) fail('Terlalu banyak percobaan. Coba lagi 10 menit lagi.', 429);
    $u = row('SELECT id, role, password_hash FROM users WHERE role = ? AND (email = ? OR hp = ?)', [$role, $idv, norm_hp($idv)]);
    if (!$u || !password_verify($pw, $u['password_hash'])) {
        note_fail($key);
        fail('Akun tidak ditemukan atau kata sandi salah. Cek juga tab peran (Petani / Bos tani).', 401);
    }
    clear_fail($key);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $u['id'];
    out(['ok' => true, 'role' => $u['role']]);
}

function h_auth_logout()
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    out(['ok' => true]);
}

function h_auth_me()
{
    $u = me();
    out(['ok' => true, 'user' => $u ? public_user($u) : null]);
}

// Lupa kata sandi tanpa server email: verifikasi email/No.Hp + nama lengkap, lalu atur sandi baru.
function h_auth_lupa_cek()
{
    $in = input();
    $idv = strtolower(str_in($in, 'id', 150));
    $nama = str_in($in, 'nama', 100);
    if ($idv === '' || $nama === '') fail('Email/No.Hp dan nama lengkap wajib diisi.');
    $key = 'lupa:' . $idv;
    if (too_many($key)) fail('Terlalu banyak percobaan. Coba lagi 10 menit lagi.', 429);
    $list = rows('SELECT id FROM users WHERE (email = ? OR hp = ?) AND LOWER(nama) = LOWER(?)', [$idv, norm_hp($idv), $nama]);
    if (!$list) {
        note_fail($key);
        fail('Data tidak cocok dengan akun mana pun.', 404);
    }
    clear_fail($key);
    $ids = [];
    foreach ($list as $r) $ids[] = (int) $r['id'];
    $_SESSION['reset_ids'] = $ids;
    out(['ok' => true]);
}

function h_auth_lupa_reset()
{
    $in = input();
    $pw = isset($in['password']) ? (string) $in['password'] : '';
    if (empty($_SESSION['reset_ids'])) fail('Verifikasi akun dulu.', 403);
    if (strlen($pw) < 8) fail('Kata sandi minimal 8 karakter.');
    $hash = password_hash($pw, PASSWORD_DEFAULT);
    foreach ($_SESSION['reset_ids'] as $id) {
        run('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, (int) $id]);
    }
    unset($_SESSION['reset_ids']);
    out(['ok' => true]);
}

// Login Google/Facebook MODE DEMO (tanpa OAuth). Matikan lewat config.php -> demo_social.
function h_auth_sosial()
{
    if (!cfg('demo_social')) fail('Login Google/Facebook belum diaktifkan.', 403);
    $in = input();
    $role = isset($in['role']) ? $in['role'] : '';
    $prov = isset($in['provider']) ? strtolower((string) $in['provider']) : '';
    if (!in_array($role, ['petani', 'bos'], true) || !in_array($prov, ['google', 'facebook'], true)) fail('Permintaan tidak valid.');
    $email = $prov . '-' . $role . '@demo.farm';
    $u = row('SELECT id FROM users WHERE role = ? AND email = ?', [$role, $email]);
    if (!$u) {
        $hp = '0999' . str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        $id = insert('INSERT INTO users (role, nama, email, hp, password_hash) VALUES (?, ?, ?, ?, ?)', [$role, 'Pengguna ' . ucfirst($prov), $email, $hp, password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT)]);
    } else {
        $id = (int) $u['id'];
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = $id;
    out(['ok' => true, 'role' => $role]);
}
