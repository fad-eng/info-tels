<?php
// Mengecek siapa yang sedang login (dipakai saat halaman di-refresh).
require __DIR__ . '/config.php';

$u = $_SESSION['user'] ?? null;
if (!$u) respon(['success' => false]);

if (($u['tipe'] ?? '') === 'siswa') {
    $s = koneksi()->prepare('SELECT nama, nis, kelas, status FROM siswa WHERE id = ?');
    $s->execute([(int)$u['id']]);
    $r = $s->fetch();
    if (!$r || $r['status'] !== 'aktif') { keluarSesi(); respon(['success' => false]); }
    respon(['success' => true, 'tipe' => 'siswa', 'nama' => $r['nama'], 'nis' => $r['nis'], 'kelas' => $r['kelas']]);
}

if (($u['tipe'] ?? '') === 'admin') {
    $s = koneksi()->prepare('SELECT nama, email FROM admins WHERE id = ?');
    $s->execute([(int)$u['id']]);
    $r = $s->fetch();
    if (!$r) { keluarSesi(); respon(['success' => false]); }
    respon(['success' => true, 'tipe' => 'admin', 'nama' => $r['nama'], 'email' => $r['email']]);
}

respon(['success' => false]);
