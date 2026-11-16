<?php
// Kelola akun siswa (verifikasi). Hanya untuk admin yang sudah login.
require __DIR__ . '/config.php';
wajibAdmin();

$pdo = koneksi();

// ---- Daftar siswa ----
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = (string)($_GET['status'] ?? 'semua');

    $counts = ['pending' => 0, 'aktif' => 0, 'ditolak' => 0];
    foreach ($pdo->query('SELECT status, COUNT(*) AS n FROM siswa GROUP BY status')->fetchAll() as $c) {
        $counts[$c['status']] = (int)$c['n'];
    }

    if (in_array($status, ['pending', 'aktif', 'ditolak'], true)) {
        $stmt = $pdo->prepare('SELECT id, nama, nis, kelas, status, DATE(created_at) AS tanggal FROM siswa WHERE status = ? ORDER BY created_at DESC, id DESC');
        $stmt->execute([$status]);
    } else {
        $stmt = $pdo->query('SELECT id, nama, nis, kelas, status, DATE(created_at) AS tanggal FROM siswa ORDER BY created_at DESC, id DESC');
    }
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) $r['id'] = (int)$r['id'];
    unset($r);

    respon(['success' => true, 'counts' => $counts, 'data' => $rows]);
}

// ---- Aksi: setujui / tolak / hapus / reset_password ----
wajibPost();
$in   = bacaInput();
$aksi = (string)($in['aksi'] ?? '');
$id   = (int)($in['id'] ?? 0);
if ($id <= 0) {
    respon(['success' => false, 'message' => 'ID tidak valid.'], 422);
}

if ($aksi === 'setujui') {
    $pdo->prepare("UPDATE siswa SET status = 'aktif', diverifikasi_at = NOW() WHERE id = ?")->execute([$id]);
    respon(['success' => true]);
}
if ($aksi === 'tolak') {
    $pdo->prepare("UPDATE siswa SET status = 'ditolak', diverifikasi_at = NOW() WHERE id = ?")->execute([$id]);
    respon(['success' => true]);
}
if ($aksi === 'hapus') {
    $pdo->prepare('DELETE FROM siswa WHERE id = ?')->execute([$id]);
    respon(['success' => true]);
}
if ($aksi === 'reset_password') {
    $baru = (string)($in['password'] ?? '');
    if (strlen($baru) < 6) {
        respon(['success' => false, 'message' => 'Password baru minimal 6 karakter.'], 422);
    }
    $pdo->prepare('UPDATE siswa SET password = ? WHERE id = ?')->execute([password_hash($baru, PASSWORD_DEFAULT), $id]);
    respon(['success' => true]);
}

respon(['success' => false, 'message' => 'Aksi tidak dikenal.'], 400);
