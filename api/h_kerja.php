<?php
// Petani mengirim laporan progres. Foto pengerjaan WAJIB (1 sampai 3).
function h_kerja_laporan()
{
    $u = need_role('petani');
    $in = input();
    $kid = (int) (isset($in['kerja_id']) ? $in['kerja_id'] : 0);
    $tahap = isset($in['tahap']) ? (int) $in['tahap'] : -1;
    $catatan = str_in($in, 'catatan', 1000);
    $fotos = isset($in['fotos']) && is_array($in['fotos']) ? array_values($in['fotos']) : [];
    $k = row('SELECT id, bos_id, lowongan_id, status FROM pekerjaan WHERE id = ? AND petani_id = ?', [$kid, $u['id']]);
    if (!$k) fail('Pekerjaan tidak ditemukan.', 404);
    if ($k['status'] !== 'berjalan') fail('Pekerjaan ini tidak menerima laporan lagi.', 409);
    $tahNames = [];
    foreach (rows('SELECT nama FROM lowongan_tahap WHERE lowongan_id = ? ORDER BY urutan', [(int) $k['lowongan_id']]) as $t) $tahNames[] = $t['nama'];
    $n = count($tahNames);
    if ($n < 1) fail('Tahapan pekerjaan belum diatur oleh bos tani.', 409);
    if ($tahap < 0 || $tahap > $n - 1) fail('Tahap tidak valid.');
    if (count($fotos) < 1) fail('Wajib melampirkan foto saat pengerjaan.');
    if (count($fotos) > 3) fail('Maksimal 3 foto per laporan.');
    $maks = val('SELECT MAX(tahap) FROM laporan WHERE pekerjaan_id = ?', [$kid]);
    if ($maks !== null && $tahap < (int) $maks) fail('Tahap tidak boleh mundur dari laporan sebelumnya.');
    $paths = [];
    foreach ($fotos as $f) $paths[] = save_image($f);   // validasi semua gambar dulu
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $lid = insert('INSERT INTO laporan (pekerjaan_id, tahap, catatan) VALUES (?, ?, ?)', [$kid, $tahap, $catatan]);
        foreach ($paths as $p) run('INSERT INTO laporan_foto (laporan_id, path) VALUES (?, ?)', [$lid, $p]);
        if ($tahap === $n - 1) run("UPDATE pekerjaan SET status = 'menunggu', menunggu_at = ? WHERE id = ?", [date('Y-m-d H:i:s'), $kid]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        foreach ($paths as $p) delete_upload($p);
        throw $e;
    }
    notify_user((int) $k['bos_id'], 'laporan', $u['nama'] . ' mengirim laporan tahap ' . $tahNames[$tahap]);
    out(['ok' => true, 'id' => $lid]);
}

// Bos tani menandai pekerjaan selesai (setelah petani melapor tahap Panen).
function h_kerja_selesai()
{
    $u = need_role('bos');
    $in = input();
    $kid = (int) (isset($in['kerja_id']) ? $in['kerja_id'] : 0);
    $k = row('SELECT p.id, p.petani_id, p.status, l.nama AS job_nama FROM pekerjaan p JOIN lowongan l ON l.id = p.lowongan_id WHERE p.id = ? AND p.bos_id = ?', [$kid, $u['id']]);
    if (!$k) fail('Pekerjaan tidak ditemukan.', 404);
    if ($k['status'] !== 'menunggu') fail('Pekerjaan baru bisa diselesaikan setelah petani melapor tahap terakhir.', 409);
    run("UPDATE pekerjaan SET status = 'selesai', selesai_at = ? WHERE id = ?", [date('Y-m-d H:i:s'), $kid]);
    notify_user((int) $k['petani_id'], 'pesan', 'Pekerjaan ' . $k['job_nama'] . ' dinyatakan selesai. Kamu sekarang bisa memberi rating.');
    out(['ok' => true]);
}

// Bagi hasil HANYA dicatat dan dihitung oleh bos tani (pemilik lahan). Hitungan dilakukan di server.
function h_bagi_simpan()
{
    $u = need_role('bos');
    $in = input();
    $kid = (int) (isset($in['kerja_id']) ? $in['kerja_id'] : 0);
    $tgl = str_in($in, 'tanggal', 10);
    $ton = isset($in['ton']) ? (float) $in['ton'] : 0;
    $harga = isset($in['harga']) ? (int) round((float) $in['harga']) : 0;
    $modal = isset($in['modal']) ? (int) round((float) $in['modal']) : 0;
    $d = DateTime::createFromFormat('Y-m-d', $tgl);
    if (!$d || $d->format('Y-m-d') !== $tgl) fail('Tanggal panen tidak valid.');
    if ($ton <= 0 || $ton > 100000) fail('Jumlah hasil panen tidak valid.');
    if ($harga <= 0) fail('Harga jual per ton wajib diisi.');
    if ($modal < 0) fail('Modal tidak valid.');
    $k = row('SELECT p.id, p.petani_id, p.persen_petani, p.lowongan_id, l.nama AS job_nama FROM pekerjaan p JOIN lowongan l ON l.id = p.lowongan_id WHERE p.id = ? AND p.bos_id = ?', [$kid, $u['id']]);
    if (!$k) fail('Pekerjaan tidak ditemukan.', 404);
    $maks = val('SELECT MAX(tahap) FROM laporan WHERE pekerjaan_id = ?', [$kid]);
    $n = (int) val('SELECT COUNT(*) FROM lowongan_tahap WHERE lowongan_id = ?', [(int) $k['lowongan_id']]);
    if ($maks === null || (int) $maks < $n - 1) fail('Hasil panen baru bisa dicatat setelah petani melapor tahap terakhir.', 409);
    if ((int) val('SELECT COUNT(*) FROM bagi_hasil WHERE pekerjaan_id = ?', [$kid]) > 0) fail('Bagi hasil pekerjaan ini sudah dicatat.', 409);
    $kotor = (int) round($ton * $harga);
    $bersih = $kotor - $modal;
    if ($bersih <= 0) fail('Pendapatan bersih tidak boleh nol atau minus.');
    $id = insert('INSERT INTO bagi_hasil (pekerjaan_id, tanggal, ton, harga_per_ton, kotor, modal, bersih, persen_petani) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [$kid, $tgl, $ton, $harga, $kotor, $modal, $bersih, (int) $k['persen_petani']]);
    $bagianPetani = (int) round($bersih * (int) $k['persen_petani'] / 100);
    notify_user((int) $k['petani_id'], 'bagi', 'Bos tani mencatat bagi hasil ' . $k['job_nama'] . ': bagianmu Rp ' . number_format($bagianPetani, 0, ',', '.'));
    out(['ok' => true, 'id' => $id, 'kotor' => $kotor, 'bersih' => $bersih]);
}
