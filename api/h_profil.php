<?php
function h_profil_update()
{
    $u = need_login();
    $in = input();
    $nama = str_in($in, 'nama', 100);
    $hp = norm_hp(str_in($in, 'hp', 30));
    $alamat = str_in($in, 'alamat', 255);
    $peng = str_in($in, 'pengalaman', 30);
    if (mb_strlen($nama) < 2) fail('Nama lengkap wajib diisi.');
    if (!preg_match('/^\+?[0-9]{8,15}$/', $hp)) fail('Nomor HP belum benar.');
    $dup = val('SELECT COUNT(*) FROM users WHERE role = ? AND hp = ? AND id <> ?', [$u['role'], $hp, $u['id']]);
    if ((int) $dup > 0) fail('No.Hp sudah dipakai akun lain.', 409);
    run('UPDATE users SET nama = ?, hp = ?, alamat = ?, pengalaman = ? WHERE id = ?', [$nama, $hp, $alamat, $peng, $u['id']]);
    out(['ok' => true]);
}

function h_profil_foto()
{
    $u = need_login();
    $in = input();
    $path = save_image(isset($in['foto']) ? $in['foto'] : '');
    $old = val('SELECT foto FROM users WHERE id = ?', [$u['id']]);
    run('UPDATE users SET foto = ? WHERE id = ?', [$path, $u['id']]);
    delete_upload($old);
    out(['ok' => true, 'foto' => $path]);
}

function h_profil_sandi()
{
    $u = need_login();
    $in = input();
    $lama = isset($in['lama']) ? (string) $in['lama'] : '';
    $baru = isset($in['baru']) ? (string) $in['baru'] : '';
    $hash = val('SELECT password_hash FROM users WHERE id = ?', [$u['id']]);
    if (!password_verify($lama, (string) $hash)) fail('Kata sandi saat ini salah.', 403);
    if (strlen($baru) < 8) fail('Kata sandi baru minimal 8 karakter.');
    run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($baru, PASSWORD_DEFAULT), $u['id']]);
    out(['ok' => true]);
}

function h_profil_hapus()
{
    $u = need_login();
    $in = input();
    $pw = isset($in['password']) ? (string) $in['password'] : '';
    $hash = val('SELECT password_hash FROM users WHERE id = ?', [$u['id']]);
    if (!password_verify($pw, (string) $hash)) fail('Kata sandi salah.', 403);
    run('DELETE FROM users WHERE id = ?', [$u['id']]);
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

function h_profil_notif()
{
    $u = need_login();
    $in = input();
    $jenis = isset($in['jenis']) ? (string) $in['jenis'] : '';
    if (!in_array($jenis, ['lowongan', 'pelamar', 'bagi', 'pesan'], true)) fail('Jenis notifikasi tidak valid.');
    $aktif = !empty($in['aktif']) ? 1 : 0;
    run('DELETE FROM notif_prefs WHERE user_id = ? AND jenis = ?', [$u['id'], $jenis]);
    run('INSERT INTO notif_prefs (user_id, jenis, aktif) VALUES (?, ?, ?)', [$u['id'], $jenis, $aktif]);
    out(['ok' => true]);
}
