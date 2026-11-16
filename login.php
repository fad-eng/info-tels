<?php
// Login SISWA (NIS + password). Hanya akun berstatus "aktif" yang bisa masuk.
require __DIR__ . '/config.php';
wajibPost();

$in       = bacaInput();
$nis      = trim((string)($in['nis'] ?? ''));
$password = (string)($in['password'] ?? '');

if ($nis === '' || $password === '') {
    respon(['success' => false, 'message' => 'NIS dan password wajib diisi.'], 422);
}

$kunci = 'siswa|' . strtolower($nis) . '|' . ipKlien();
batasCek($kunci);

$stmt = koneksi()->prepare('SELECT id, nama, nis, kelas, password, status FROM siswa WHERE nis = ?');
$stmt->execute([$nis]);
$s = $stmt->fetch();

if (!$s || !password_verify($password, $s['password'])) {
    batasGagal($kunci);
    usleep(600000);
    respon(['success' => false, 'message' => 'NIS atau password salah.'], 401);
}

if ($s['status'] === 'pending') {
    respon(['success' => false, 'message' => 'Akunmu belum diverifikasi admin. Tunggu persetujuan, lalu coba masuk lagi.'], 403);
}
if ($s['status'] === 'ditolak') {
    respon(['success' => false, 'message' => 'Akunmu tidak disetujui atau dinonaktifkan. Hubungi admin sekolah.'], 403);
}

batasReset($kunci);
session_regenerate_id(true);
$_SESSION['user'] = ['tipe' => 'siswa', 'id' => (int)$s['id']];

respon(['success' => true, 'tipe' => 'siswa', 'nama' => $s['nama'], 'kelas' => $s['kelas'], 'nis' => $s['nis']]);
