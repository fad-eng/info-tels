<?php
// Login ADMIN (email + password), terpisah dari login siswa.
require __DIR__ . '/config.php';
wajibPost();

$in       = bacaInput();
$email    = strtolower(trim((string)($in['email'] ?? '')));
$password = (string)($in['password'] ?? '');

if ($email === '' || $password === '') {
    respon(['success' => false, 'message' => 'Email dan password wajib diisi.'], 422);
}

$kunci = 'admin|' . $email . '|' . ipKlien();
batasCek($kunci);

$stmt = koneksi()->prepare('SELECT id, nama, email, password FROM admins WHERE email = ?');
$stmt->execute([$email]);
$a = $stmt->fetch();

if (!$a || !password_verify($password, $a['password'])) {
    batasGagal($kunci);
    usleep(600000);
    respon(['success' => false, 'message' => 'Email atau password salah.'], 401);
}

batasReset($kunci);
session_regenerate_id(true);
$_SESSION['user'] = ['tipe' => 'admin', 'id' => (int)$a['id']];

respon(['success' => true, 'tipe' => 'admin', 'nama' => $a['nama'], 'email' => $a['email']]);
