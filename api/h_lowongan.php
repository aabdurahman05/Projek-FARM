<?php
function h_lowongan_buat()
{
    $u = need_role('bos');
    $in = input();
    $nama = str_in($in, 'nama', 120);
    $lokasi = str_in($in, 'lokasi', 200);
    $jenis = str_in($in, 'jenis', 40);
    $est = str_in($in, 'estimasi', 20);
    $desk = str_in($in, 'deskripsi', 1500);
    $pet = isset($in['persen_petani']) ? (int) $in['persen_petani'] : 0;
    if ($nama === '' || $lokasi === '' || $desk === '') fail('Nama, lokasi, dan deskripsi wajib diisi.');
    if (!in_array($jenis, ['Perawatan', 'Penanaman', 'Pemanenan', 'Pengolahan lahan'], true)) fail('Jenis pekerjaan tidak valid.');
    if ($est === '') $est = '3 bulan';
    if ($pet < 1 || $pet > 99) fail('Persentase petani harus antara 1 dan 99.');
    // Tahapan pekerjaan dibuat bos tani; petani hanya melaporkan tahapan ini.
    $tah = [];
    if (isset($in['tahapan']) && is_array($in['tahapan'])) {
        foreach ($in['tahapan'] as $t) {
            $t = mb_substr(trim((string) $t), 0, 60);
            if ($t !== '') $tah[] = $t;
        }
    }
    if (count($tah) < 1) fail('Tambahkan minimal 1 tahapan pekerjaan.');
    if (count($tah) > 8) fail('Maksimal 8 tahapan pekerjaan.');
    $foto = !empty($in['foto']) ? save_image($in['foto']) : 'assets/sawah-3.jpg';
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $id = insert('INSERT INTO lowongan (bos_id, nama, lokasi, jenis, sistem, estimasi, deskripsi, persen_petani, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$u['id'], $nama, $lokasi, $jenis, 'Bagi hasil', $est, $desk, $pet, $foto]);
        foreach ($tah as $i => $nm) {
            run('INSERT INTO lowongan_tahap (lowongan_id, urutan, nama) VALUES (?, ?, ?)', [$id, $i, $nm]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    foreach (rows("SELECT id FROM users WHERE role = 'petani'") as $p) {
        notify_user((int) $p['id'], 'lowongan', 'Lowongan baru: ' . $nama . ' di ' . $lokasi);
    }
    out(['ok' => true, 'id' => $id]);
}

function h_lowongan_hapus()
{
    $u = need_role('bos');
    $in = input();
    $n = run('UPDATE lowongan SET aktif = 0 WHERE id = ? AND bos_id = ?', [(int) (isset($in['id']) ? $in['id'] : 0), $u['id']]);
    if ($n < 1) fail('Lowongan tidak ditemukan.', 404);
    out(['ok' => true]);
}

function h_lamaran_kirim()
{
    $u = need_role('petani');
    $in = input();
    $lid = (int) (isset($in['lowongan_id']) ? $in['lowongan_id'] : 0);
    $nama = str_in($in, 'nama', 100);
    $alamat = str_in($in, 'alamat', 255);
    $ttl = str_in($in, 'ttl', 100);
    $hp = norm_hp(str_in($in, 'hp', 30));
    $tentang = str_in($in, 'tentang', 1000);
    if ($nama === '' || $alamat === '' || $ttl === '' || $hp === '') fail('Nama, alamat, tempat tanggal lahir, dan No hp wajib diisi.');
    if (!preg_match('/^\+?[0-9]{8,15}$/', $hp)) fail('Nomor HP belum benar.');
    $low = row('SELECT id, bos_id, nama FROM lowongan WHERE id = ? AND aktif = 1', [$lid]);
    if (!$low) fail('Lowongan tidak ditemukan.', 404);
    $ada = val('SELECT COUNT(*) FROM lamaran WHERE lowongan_id = ? AND petani_id = ?', [$lid, $u['id']]);
    if ((int) $ada > 0) fail('Kamu sudah melamar lowongan ini.', 409);
    $id = insert('INSERT INTO lamaran (lowongan_id, petani_id, nama, alamat, ttl, hp, tentang) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [$lid, $u['id'], $nama, $alamat, $ttl, $hp, $tentang]);
    notify_user((int) $low['bos_id'], 'pelamar', $nama . ' melamar ke ' . $low['nama']);
    out(['ok' => true, 'id' => $id]);
}

// Bos tani menerima / menolak lamaran. Jika diterima, pekerjaan (kerja sama) dimulai.
function h_lamaran_putus()
{
    $u = need_role('bos');
    $in = input();
    $id = (int) (isset($in['id']) ? $in['id'] : 0);
    $status = isset($in['status']) ? $in['status'] : '';
    if (!in_array($status, ['Diterima', 'Ditolak'], true)) fail('Status tidak valid.');
    $a = row('SELECT a.id, a.petani_id, a.status, l.id AS lowongan_id, l.nama AS job_nama, l.persen_petani FROM lamaran a JOIN lowongan l ON l.id = a.lowongan_id WHERE a.id = ? AND l.bos_id = ?', [$id, $u['id']]);
    if (!$a) fail('Lamaran tidak ditemukan.', 404);
    if ($a['status'] !== 'Menunggu') fail('Lamaran ini sudah diproses.', 409);
    $pdo = db();
    $pdo->beginTransaction();
    try {
        run('UPDATE lamaran SET status = ? WHERE id = ?', [$status, $id]);
        if ($status === 'Diterima') {
            insert('INSERT INTO pekerjaan (lamaran_id, lowongan_id, bos_id, petani_id, mulai, status, persen_petani) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$id, (int) $a['lowongan_id'], $u['id'], (int) $a['petani_id'], date('Y-m-d'), 'berjalan', (int) $a['persen_petani']]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    notify_user((int) $a['petani_id'], 'lowongan', 'Lamaranmu ke ' . $a['job_nama'] . ' ' . strtolower($status));
    out(['ok' => true]);
}
