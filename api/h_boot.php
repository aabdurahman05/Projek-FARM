<?php
// Satu panggilan yang mengembalikan semua data yang dibutuhkan dashboard untuk pengguna yang sedang masuk.
function h_boot()
{
    $u = need_login();
    $uid = $u['id'];
    $bos = $u['role'] === 'bos';

    $prefs = ['lowongan' => true, 'pelamar' => true, 'bagi' => true, 'pesan' => true];
    foreach (rows('SELECT jenis, aktif FROM notif_prefs WHERE user_id = ?', [$uid]) as $p) {
        $prefs[$p['jenis']] = (int) $p['aktif'] === 1;
    }

    // Lowongan: petani melihat semua yang aktif, bos tani hanya miliknya.
    $lowSql = 'SELECT l.id, l.bos_id, ub.nama AS owner, l.nama, l.lokasi, l.jenis, l.sistem, l.estimasi, l.deskripsi, l.persen_petani, l.foto
               FROM lowongan l JOIN users ub ON ub.id = l.bos_id WHERE l.aktif = 1';
    $low = $bos ? rows($lowSql . ' AND l.bos_id = ? ORDER BY l.id DESC', [$uid]) : rows($lowSql . ' ORDER BY l.id DESC');
    int_rows($low, ['id', 'bos_id', 'persen_petani']);

    // Lamaran: petani melihat miliknya, bos tani melihat yang masuk ke lowongannya.
    $lamSql = 'SELECT a.id, a.lowongan_id, a.petani_id, a.nama, a.alamat, a.ttl, a.hp, a.tentang, a.status,
                      l.nama AS job_nama, l.lokasi AS job_lokasi, l.foto AS job_foto, l.persen_petani, l.bos_id,
                      ub.nama AS owner, up.pengalaman, up.foto AS pfoto
               FROM lamaran a
               JOIN lowongan l ON l.id = a.lowongan_id
               JOIN users ub ON ub.id = l.bos_id
               JOIN users up ON up.id = a.petani_id
               WHERE ' . ($bos ? 'l.bos_id = ?' : 'a.petani_id = ?') . " ORDER BY (a.status = 'Menunggu') DESC, a.id DESC";
    $lam = rows($lamSql, [$uid]);
    int_rows($lam, ['id', 'lowongan_id', 'petani_id', 'persen_petani', 'bos_id']);

    // Pekerjaan (kerja sama) beserta laporan dan foto laporan.
    $kerjaSql = 'SELECT k.id, k.lamaran_id, k.lowongan_id, k.bos_id, k.petani_id, k.mulai, k.status, k.persen_petani,
                        l.nama AS job_nama, l.lokasi, l.foto, ub.nama AS owner, ub.foto AS bos_foto, up.nama AS petani, up.foto AS petani_foto,
                        (SELECT COUNT(*) FROM rating r WHERE r.pekerjaan_id = k.id AND r.dari_id = ?) AS rated,
                        (SELECT COUNT(*) FROM bagi_hasil b WHERE b.pekerjaan_id = k.id) AS bagi_ada
                 FROM pekerjaan k
                 JOIN lowongan l ON l.id = k.lowongan_id
                 JOIN users ub ON ub.id = k.bos_id
                 JOIN users up ON up.id = k.petani_id
                 WHERE ' . ($bos ? 'k.bos_id = ?' : 'k.petani_id = ?') . ' ORDER BY k.id DESC';
    $kerja = rows($kerjaSql, [$uid, $uid]);
    int_rows($kerja, ['id', 'lamaran_id', 'lowongan_id', 'bos_id', 'petani_id', 'persen_petani', 'rated', 'bagi_ada']);
    $kids = [];
    foreach ($kerja as $k) $kids[] = $k['id'];
    $lapBy = [];
    if ($kids) {
        $laps = rows('SELECT id, pekerjaan_id, tahap, catatan, UNIX_TIMESTAMP(created_at) * 1000 AS t FROM laporan WHERE pekerjaan_id IN (' . in_marks($kids) . ') ORDER BY id', $kids);
        $lids = [];
        foreach ($laps as $l) $lids[] = (int) $l['id'];
        $fotoBy = [];
        if ($lids) {
            foreach (rows('SELECT laporan_id, path FROM laporan_foto WHERE laporan_id IN (' . in_marks($lids) . ') ORDER BY id', $lids) as $f) {
                $fotoBy[(int) $f['laporan_id']][] = $f['path'];
            }
        }
        foreach ($laps as $l) {
            $lapBy[(int) $l['pekerjaan_id']][] = [
                'id' => (int) $l['id'], 'tahap' => (int) $l['tahap'], 'catatan' => $l['catatan'], 't' => (float) $l['t'],
                'fotos' => isset($fotoBy[(int) $l['id']]) ? $fotoBy[(int) $l['id']] : [],
            ];
        }
    }
    // Tahapan pekerjaan milik tiap lowongan (dibuat bos tani).
    $need = [];
    foreach ($low as $l) $need[$l['id']] = true;
    foreach ($kerja as $k) $need[$k['lowongan_id']] = true;
    $tahBy = [];
    if ($need) {
        $nk = array_keys($need);
        foreach (rows('SELECT lowongan_id, nama FROM lowongan_tahap WHERE lowongan_id IN (' . in_marks($nk) . ') ORDER BY lowongan_id, urutan', $nk) as $t) {
            $tahBy[(int) $t['lowongan_id']][] = $t['nama'];
        }
    }
    foreach ($low as &$l) {
        $l['tahapan'] = isset($tahBy[$l['id']]) ? $tahBy[$l['id']] : [];
    }
    unset($l);
    foreach ($kerja as &$k) {
        $k['rated'] = $k['rated'] > 0;
        $k['bagi_ada'] = $k['bagi_ada'] > 0;
        $k['laporan'] = isset($lapBy[$k['id']]) ? $lapBy[$k['id']] : [];
        $k['tahapan'] = isset($tahBy[$k['lowongan_id']]) ? $tahBy[$k['lowongan_id']] : [];
    }
    unset($k);

    // Riwayat bagi hasil.
    $bagi = rows('SELECT b.id, b.pekerjaan_id, b.tanggal, b.ton, b.harga_per_ton, b.kotor, b.modal, b.bersih, b.persen_petani,
                         l.nama AS job, up.nama AS petani, up.foto AS petani_foto, ub.nama AS bos, ub.foto AS bos_foto
                  FROM bagi_hasil b
                  JOIN pekerjaan k ON k.id = b.pekerjaan_id
                  JOIN lowongan l ON l.id = k.lowongan_id
                  JOIN users up ON up.id = k.petani_id
                  JOIN users ub ON ub.id = k.bos_id
                  WHERE ' . ($bos ? 'k.bos_id = ?' : 'k.petani_id = ?') . ' ORDER BY b.tanggal DESC, b.id DESC', [$uid]);
    int_rows($bagi, ['id', 'pekerjaan_id', 'harga_per_ton', 'kotor', 'modal', 'bersih', 'persen_petani']);
    foreach ($bagi as &$b) $b['ton'] = (float) $b['ton'];
    unset($b);

    $notif = rows('SELECT id, jenis, teks, dibaca, UNIX_TIMESTAMP(created_at) * 1000 AS t FROM notifikasi WHERE user_id = ? ORDER BY id DESC LIMIT 30', [$uid]);
    foreach ($notif as &$n) {
        $n['id'] = (int) $n['id'];
        $n['dibaca'] = (int) $n['dibaca'] === 1;
        $n['t'] = (float) $n['t'];
    }
    unset($n);

    $ag = row('SELECT AVG(bintang) AS a, COUNT(*) AS c FROM rating WHERE untuk_id = ?', [$uid]);
    out([
        'ok' => true,
        'me' => public_user($u),
        'prefs' => $prefs,
        'lowongan' => $low,
        'lamaran' => $lam,
        'kerja' => $kerja,
        'bagi' => $bagi,
        'notif' => $notif,
        'rating' => ['avg' => ($ag && (int) $ag['c'] > 0) ? round((float) $ag['a'], 1) : 0, 'count' => $ag ? (int) $ag['c'] : 0],
    ]);
}
