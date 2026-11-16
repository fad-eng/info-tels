<?php
// Pendaftaran ADMIN. Butuh KODE_ADMIN (rahasia, diatur di config.php).
require __DIR__ . '/config.php';
wajibPost();

$in       = bacaInput();
$nama     = trim((string)($in['nama'] ?? ''));
$email    = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');
$kode     = trim((string)($in['kode'] ?? ''));

$kunci = 'admin_daftar|' . ipKlien();
batasCek($kunci);

if ($nama === '' || $email === '' || $password === '' || $kode === '') {
    respon(['success' => false, 'message' => 'Semua kolom wajib diisi.'], 422);
}
if (!hash_equals(KODE_ADMIN, $kode)) {
    batasGagal($kunci);
    usleep(600000);
    respon(['success' => false, 'message' => 'Kode admin salah.'], 403);
}
if (mb_strlen($nama) < 2 || mb_strlen($nama) > 100) {
    respon(['success' => false, 'message' => 'Nama harus 2–100 karakter.'], 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respon(['success' => false, 'message' => 'Format email tidak valid.'], 422);
}
if (strlen($password) < 8) {
    respon(['success' => false, 'message' => 'Password admin minimal 8 karakter.'], 422);
}

$pdo = koneksi();
$cek = $pdo->prepare('SELECT id FROM admins WHERE email = ?');
$cek->execute([$email]);
if ($cek->fetch()) {
    respon(['success' => false, 'message' => 'Email sudah terdaftar. Silakan masuk.'], 409);
}

try {
    $simpan = $pdo->prepare('INSERT INTO admins (nama, email, password) VALUES (?, ?, ?)');
    $simpan->execute([$nama, $email, password_hash($password, PASSWORD_DEFAULT)]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        respon(['success' => false, 'message' => 'Email sudah terdaftar. Silakan masuk.'], 409);
    }
    throw $e;
}

respon(['success' => true, 'message' => 'Akun admin berhasil dibuat. Silakan masuk.']);
