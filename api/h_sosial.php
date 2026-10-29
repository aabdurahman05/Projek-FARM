<?php
// ---------------- Chat ----------------
function h_chat_contacts()
{
    $u = need_login();
    $uid = $u['id'];
    $ids = [];
    foreach (rows('SELECT dari_id AS x FROM pesan WHERE ke_id = ? UNION SELECT ke_id AS x FROM pesan WHERE dari_id = ?', [$uid, $uid]) as $r) $ids[(int) $r['x']] = true;
    if ($u['role'] === 'petani') {
        foreach (rows('SELECT DISTINCT bos_id AS x FROM lowongan WHERE aktif = 1 UNION SELECT bos_id AS x FROM pekerjaan WHERE petani_id = ?', [$uid]) as $r) $ids[(int) $r['x']] = true;
    } else {
        foreach (rows('SELECT DISTINCT a.petani_id AS x FROM lamaran a JOIN lowongan l ON l.id = a.lowongan_id WHERE l.bos_id = ? UNION SELECT petani_id AS x FROM pekerjaan WHERE bos_id = ?', [$uid, $uid]) as $r) $ids[(int) $r['x']] = true;
    }
    unset($ids[$uid]);
    $list = [];
    if ($ids) {
        $keys = array_keys($ids);
        $users = rows('SELECT id, nama, role, foto FROM users WHERE id IN (' . in_marks($keys) . ') AND role <> ?', array_merge($keys, [$u['role']]));
        foreach ($users as $c) {
            $cid = (int) $c['id'];
            $last = row('SELECT isi, foto, UNIX_TIMESTAMP(created_at) * 1000 AS t FROM pesan WHERE (dari_id = ? AND ke_id = ?) OR (dari_id = ? AND ke_id = ?) ORDER BY id DESC LIMIT 1', [$uid, $cid, $cid, $uid]);
            $unread = (int) val('SELECT COUNT(*) FROM pesan WHERE dari_id = ? AND ke_id = ? AND dibaca = 0', [$cid, $uid]);
            $list[] = [
                'id' => $cid, 'nama' => $c['nama'], 'role' => $c['role'], 'foto' => $c['foto'],
                'sub' => $c['role'] === 'bos' ? 'Bos tani' : 'Petani',
                'last' => $last ? ['isi' => $last['isi'], 'foto' => !empty($last['foto']), 't' => (float) $last['t']] : null,
                'unread' => $unread,
            ];
        }
        usort($list, function ($a, $b) {
            $ta = $a['last'] ? $a['last']['t'] : 0;
            $tb = $b['last'] ? $b['last']['t'] : 0;
            if ($ta === $tb) return strcmp($a['nama'], $b['nama']);
            return $ta < $tb ? 1 : -1;
        });
    }
    out(['ok' => true, 'contacts' => $list]);
}

function chat_target($u, $id)
{
    $t = row('SELECT id, nama, role, foto FROM users WHERE id = ?', [(int) $id]);
    if (!$t || $t['role'] === $u['role']) fail('Kontak tidak ditemukan.', 404);
    return $t;
}

function h_chat_thread()
{
    $u = need_login();
    $t = chat_target($u, isset($_GET['with']) ? $_GET['with'] : 0);
    $uid = $u['id'];
    $tid = (int) $t['id'];
    run('UPDATE pesan SET dibaca = 1 WHERE dari_id = ? AND ke_id = ? AND dibaca = 0', [$tid, $uid]);
    $msgs = rows('SELECT id, dari_id, isi, foto, UNIX_TIMESTAMP(created_at) * 1000 AS t FROM pesan WHERE (dari_id = ? AND ke_id = ?) OR (dari_id = ? AND ke_id = ?) ORDER BY id DESC LIMIT 300', [$uid, $tid, $tid, $uid]);
    $msgs = array_reverse($msgs);
    $res = [];
    foreach ($msgs as $m) {
        $res[] = ['id' => (int) $m['id'], 'saya' => (int) $m['dari_id'] === $uid, 'isi' => $m['isi'], 'foto' => $m['foto'], 't' => (float) $m['t']];
    }
    out(['ok' => true, 'with' => ['id' => $tid, 'nama' => $t['nama'], 'foto' => $t['foto']], 'messages' => $res]);
}

function h_chat_kirim()
{
    $u = need_login();
    $in = input();
    $t = chat_target($u, isset($in['to']) ? $in['to'] : 0);
    $isi = isset($in['isi']) ? trim((string) $in['isi']) : '';
    $isi = mb_substr($isi, 0, 2000);
    $foto = !empty($in['foto']) ? save_image($in['foto']) : null;
    if ($isi === '' && $foto === null) fail('Pesan kosong.');
    $id = insert('INSERT INTO pesan (dari_id, ke_id, isi, foto) VALUES (?, ?, ?, ?)', [$u['id'], (int) $t['id'], $isi === '' ? null : $isi, $foto]);
    notify_user((int) $t['id'], 'pesan', $u['nama'] . ' mengirim pesan');
    out(['ok' => true, 'id' => $id]);
}

// ---------------- Rating ----------------
// Rating hanya boleh diberikan setelah ada pekerjaan bersama yang SELESAI.
function h_rating_daftar()
{
    $u = need_login();
    $target = (int) (isset($_GET['user']) ? $_GET['user'] : 0);
    $t = row('SELECT id, nama FROM users WHERE id = ?', [$target]);
    if (!$t) fail('Pengguna tidak ditemukan.', 404);
    $agg = row('SELECT AVG(bintang) AS a, COUNT(*) AS c FROM rating WHERE untuk_id = ?', [$target]);
    $items = rows('SELECT r.bintang, r.ulasan, uu.nama AS dari, UNIX_TIMESTAMP(r.created_at) * 1000 AS t FROM rating r JOIN users uu ON uu.id = r.dari_id WHERE r.untuk_id = ? ORDER BY r.id DESC LIMIT 50', [$target]);
    foreach ($items as &$i) {
        $i['bintang'] = (int) $i['bintang'];
        $i['t'] = (float) $i['t'];
    }
    unset($i);
    $boleh = false;
    $alasan = '';
    $kid = null;
    $mine = null;
    if ($target === $u['id']) {
        $alasan = '';
    } else {
        $k = row("SELECT id FROM pekerjaan WHERE status = 'selesai' AND ((bos_id = ? AND petani_id = ?) OR (petani_id = ? AND bos_id = ?)) ORDER BY id DESC LIMIT 1", [$u['id'], $target, $u['id'], $target]);
        if ($k) {
            $boleh = true;
            $kid = (int) $k['id'];
            $m = row('SELECT bintang, ulasan FROM rating WHERE pekerjaan_id = ? AND dari_id = ?', [$kid, $u['id']]);
            if ($m) $mine = ['bintang' => (int) $m['bintang'], 'ulasan' => $m['ulasan']];
        } else {
            $alasan = 'Rating baru bisa diberikan setelah pekerjaan bersama selesai. Sekarang kamu hanya bisa melihat rating dari orang lain.';
        }
    }
    out(['ok' => true, 'avg' => $agg && $agg['c'] ? round((float) $agg['a'], 1) : 0, 'count' => (int) $agg['c'], 'items' => $items, 'boleh' => $boleh, 'alasan' => $alasan, 'kerja_id' => $kid, 'mine' => $mine]);
}

function h_rating_kirim()
{
    $u = need_login();
    $in = input();
    $kid = (int) (isset($in['kerja_id']) ? $in['kerja_id'] : 0);
    $b = (int) (isset($in['bintang']) ? $in['bintang'] : 0);
    $ul = str_in($in, 'ulasan', 500);
    if ($b < 1 || $b > 5) fail('Pilih jumlah bintang dulu.');
    $k = row("SELECT id, bos_id, petani_id FROM pekerjaan WHERE id = ? AND status = 'selesai' AND (bos_id = ? OR petani_id = ?)", [$kid, $u['id'], $u['id']]);
    if (!$k) fail('Rating baru bisa diberikan setelah pekerjaan bersama selesai.', 403);
    $untuk = (int) $k['bos_id'] === $u['id'] ? (int) $k['petani_id'] : (int) $k['bos_id'];
    $ada = row('SELECT id FROM rating WHERE pekerjaan_id = ? AND dari_id = ?', [$kid, $u['id']]);
    if ($ada) {
        run('UPDATE rating SET bintang = ?, ulasan = ? WHERE id = ?', [$b, $ul, (int) $ada['id']]);
    } else {
        run('INSERT INTO rating (pekerjaan_id, dari_id, untuk_id, bintang, ulasan) VALUES (?, ?, ?, ?, ?)', [$kid, $u['id'], $untuk, $b, $ul]);
    }
    notify_user($untuk, 'pesan', $u['nama'] . ' memberi rating ' . $b . ' bintang');
    out(['ok' => true]);
}

// ---------------- Notifikasi ----------------
function h_notif_baca()
{
    $u = need_login();
    run('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?', [$u['id']]);
    out(['ok' => true]);
}
