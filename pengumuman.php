<?php
require __DIR__ . '/config.php';

const KATEGORI_VALID = ['akademik', 'lomba', 'libur', 'ekskul'];

// ---- Lihat daftar pengumuman ----
// Siswa: HANYA pengumuman untuk kelasnya sendiri atau "Semua Kelas" (disaring di server).
// Admin : semua pengumuman.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tipe = $_SESSION['user']['tipe'] ?? '';
    $siswa = null;
    if ($tipe === 'siswa')      $siswa = wajibSiswa();
    elseif ($tipe === 'admin')  wajibAdmin();
    else                        tolakAkses();

    $rows = koneksi()
        ->query('SELECT id, judul, isi, kategori, kelas, DATE(created_at) AS tanggal FROM pengumuman ORDER BY created_at DESC, id DESC')
        ->fetchAll();

    $hasil = [];
    foreach ($rows as $r) {
        $kelas = json_decode($r['kelas'], true);
        $kelas = (is_array($kelas) && $kelas) ? $kelas : [KELAS_ALL];

        if ($siswa !== null) {
            $untukSemua = in_array(KELAS_ALL, $kelas, true);
            if (!$untukSemua && !in_array($siswa['kelas'], $kelas, true)) {
                continue; // info kelas lain tidak dikirim sama sekali
            }
            $kelas = $untukSemua ? [KELAS_ALL] : [$siswa['kelas']]; // sembunyikan daftar kelas lain
        }

        $hasil[] = [
            'id'       => (int)$r['id'],
            'judul'    => $r['judul'],
            'isi'      => $r['isi'],
            'kategori' => $r['kategori'],
            'kelas'    => $kelas,
            'tanggal'  => $r['tanggal'],
        ];
    }
    respon(['success' => true, 'data' => $hasil]);
}

// ---- Tambah / hapus (hanya admin yang sudah login) ----
wajibPost();
$admin = wajibAdmin();
$in    = bacaInput();
$aksi  = $in['aksi'] ?? '';

if ($aksi === 'tambah') {
    $judul    = trim((string)($in['judul'] ?? ''));
    $isi      = trim((string)($in['isi'] ?? ''));
    $kategori = (string)($in['kategori'] ?? '');
    $kelas    = $in['kelas'] ?? [];

    if ($judul === '' || $isi === '') {
        respon(['success' => false, 'message' => 'Judul dan isi wajib diisi.'], 422);
    }
    if (mb_strlen($judul) > 150 || mb_strlen($isi) > 3000) {
        respon(['success' => false, 'message' => 'Judul maksimal 150 karakter dan isi maksimal 3000 karakter.'], 422);
    }
    if (!in_array($kategori, KATEGORI_VALID, true)) {
        respon(['success' => false, 'message' => 'Kategori tidak valid.'], 422);
    }
    if (!is_array($kelas) || count($kelas) === 0 || count($kelas) > 40) {
        respon(['success' => false, 'message' => 'Pilih minimal satu kelas.'], 422);
    }
    $kelasBersih = [];
    foreach ($kelas as $k) {
        if (!is_string($k) || ($k !== KELAS_ALL && !in_array($k, KELAS_LIST, true))) {
            respon(['success' => false, 'message' => 'Data kelas tidak valid.'], 422);
        }
        $kelasBersih[$k] = $k;
    }
    $kelasBersih = array_values($kelasBersih);
    if (in_array(KELAS_ALL, $kelasBersih, true)) $kelasBersih = [KELAS_ALL];

    $stmt = koneksi()->prepare('INSERT INTO pengumuman (judul, isi, kategori, kelas, user_id) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$judul, $isi, $kategori, json_encode($kelasBersih, JSON_UNESCAPED_UNICODE), $admin['id']]);

    respon(['success' => true, 'id' => (int)koneksi()->lastInsertId()]);
}

if ($aksi === 'hapus') {
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) {
        respon(['success' => false, 'message' => 'ID tidak valid.'], 422);
    }
    koneksi()->prepare('DELETE FROM pengumuman WHERE id = ?')->execute([$id]);
    respon(['success' => true]);
}

respon(['success' => false, 'message' => 'Aksi tidak dikenal.'], 400);
