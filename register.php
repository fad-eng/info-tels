<?php
// Pendaftaran SISWA. Akun baru berstatus "pending" sampai disetujui admin.
require __DIR__ . '/config.php';
wajibPost();

$in       = bacaInput();
$nama     = trim((string)($in['nama'] ?? ''));
$nis      = trim((string)($in['nis'] ?? ''));
$kelas    = trim((string)($in['kelas'] ?? ''));
$password = (string)($in['password'] ?? '');

$kunci = 'daftar|' . ipKlien();
batasCek($kunci, 30);

if ($nama === '' || $nis === '' || $kelas === '' || $password === '') {
    respon(['success' => false, 'message' => 'Semua kolom wajib diisi.'], 422);
}
if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) {
    respon(['success' => false, 'message' => 'Nama harus 2–100 karakter.'], 422);
}
if (!preg_match('/^[A-Za-z0-9]{4,20}$/', $nis)) {
    respon(['success' => false, 'message' => 'NIS harus 4–20 karakter, hanya huruf dan angka.'], 422);
}
if (!in_array($kelas, KELAS_LIST, true)) {
    respon(['success' => false, 'message' => 'Kelas tidak valid.'], 422);
}
if (strlen($password) < 6) {
    respon(['success' => false, 'message' => 'Password minimal 6 karakter.'], 422);
}

batasGagal($kunci);
$pdo = koneksi();

$cek = $pdo->prepare('SELECT id FROM siswa WHERE nis = ?');
$cek->execute([$nis]);
if ($cek->fetch()) {
    respon(['success' => false, 'message' => 'NIS sudah terdaftar. Silakan masuk atau hubungi admin.'], 409);
}

try {
    $simpan = $pdo->prepare("INSERT INTO siswa (nama, nis, kelas, password, status) VALUES (?, ?, ?, ?, 'pending')");
    $simpan->execute([$nama, $nis, $kelas, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        respon(['success' => false, 'message' => 'NIS sudah terdaftar. Silakan masuk atau hubungi admin.'], 409);
    }
    throw $e;
}

respon(['success' => true, 'message' => 'Pendaftaran berhasil. Akunmu menunggu verifikasi admin. Kamu bisa masuk setelah disetujui.']);
