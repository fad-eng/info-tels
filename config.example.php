<?php

// ====== PENGATURAN (ubah sesuai kebutuhan) ======
const DB_HOST = 'isi-hostname-mysql';
const DB_PORT = 3306;
const DB_NAME = 'isi-nama-database';
const DB_USER = 'isi-username';
const DB_PASS = 'isi-password';

// Kode rahasia untuk mendaftar akun ADMIN (guru/pengurus). Bagikan hanya ke yang berhak. WAJIB diganti!
const KODE_ADMIN = 'isi-kode-rahasia-admin';

const DEBUG = false;   // true sementara kalau mau lihat detail error, lalu kembalikan ke false
// ================================================

const KELAS_ALL = 'Semua Kelas';
const KELAS_LIST = [
    'X RPL 1', 'X RPL 2', 'X RPL 3', 'X TKJ 1', 'X TKJ 2', 'X DKV 1', 'X DKV 2', 'X Transmisi',
    'XI RPL 1', 'XI RPL 2', 'XI RPL 3', 'XI RPL 4', 'XI TKJ 1', 'XI TKJ 2', 'XI DKV 1', 'XI DKV 2', 'XI Transmisi',
    'XII RPL 1', 'XII RPL 2', 'XII RPL 3', 'XII TKJ 1', 'XII TKJ 2', 'XII DKV 1', 'XII DKV 2', 'XII Transmisi',
];

ini_set('display_errors', '0');
date_default_timezone_set('Asia/Jakarta');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Sesi login (disimpan di server, tidak bisa dipalsukan dari browser)
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
ini_set('session.use_strict_mode', '1');
ini_set('session.gc_maxlifetime', '28800');
session_name('infotels');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
@session_start();

function respon(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

set_exception_handler(function (Throwable $e) {
    $pesan = 'Terjadi masalah pada server.';
    if (DEBUG) $pesan .= ' Detail: ' . $e->getMessage();
    respon(['success' => false, 'message' => $pesan], 500);
});

function koneksi(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;

    $opsi = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    $pdo = new PDO('mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, $opsi);
    $pdo->exec("SET time_zone = '+07:00'");

    $pdo->exec("CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(100) NOT NULL,
        nis VARCHAR(20) NOT NULL UNIQUE,
        kelas VARCHAR(30) NOT NULL,
        password VARCHAR(255) NOT NULL,
        status ENUM('pending','aktif','ditolak') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        diverifikasi_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS pengumuman (
        id INT AUTO_INCREMENT PRIMARY KEY,
        judul VARCHAR(150) NOT NULL,
        isi TEXT NOT NULL,
        kategori VARCHAR(20) NOT NULL,
        kelas TEXT NOT NULL,
        user_id INT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $pdo->exec("CREATE TABLE IF NOT EXISTS percobaan (
        kunci VARCHAR(120) PRIMARY KEY,
        jumlah INT NOT NULL DEFAULT 0,
        terakhir DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    return $pdo;
}

function bacaInput(): array {
    $json = json_decode(file_get_contents('php://input'), true);
    return is_array($json) ? $json : [];
}

// Hanya menerima POST berformat JSON (sekaligus menahan permintaan dari situs lain)
function wajibPost(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respon(['success' => false, 'message' => 'Metode tidak diizinkan.'], 405);
    }
    $tipe = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    if (strpos($tipe, 'application/json') === false) {
        respon(['success' => false, 'message' => 'Format permintaan tidak valid.'], 415);
    }
}

function ipKlien(): string {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? '0'), 0, 45);
}

// ---------- Pembatas percobaan (anti tebak password) ----------
function batasCek(string $kunci, int $maks = 5): void {
    $s = koneksi()->prepare('SELECT jumlah, TIMESTAMPDIFF(SECOND, terakhir, NOW()) AS lalu FROM percobaan WHERE kunci = ?');
    $s->execute([$kunci]);
    $r = $s->fetch();
    if ($r && (int)$r['jumlah'] >= $maks) {
        if ((int)$r['lalu'] < 600) {
            respon(['success' => false, 'message' => 'Terlalu banyak percobaan. Coba lagi dalam 10 menit.'], 429);
        }
        koneksi()->prepare('DELETE FROM percobaan WHERE kunci = ?')->execute([$kunci]);
    }
}
function batasGagal(string $kunci): void {
    koneksi()->prepare(
        'INSERT INTO percobaan (kunci, jumlah, terakhir) VALUES (?, 1, NOW())
         ON DUPLICATE KEY UPDATE jumlah = IF(TIMESTAMPDIFF(SECOND, terakhir, NOW()) > 600, 1, jumlah + 1), terakhir = NOW()'
    )->execute([$kunci]);
}
function batasReset(string $kunci): void {
    koneksi()->prepare('DELETE FROM percobaan WHERE kunci = ?')->execute([$kunci]);
}

// ---------- Sesi & hak akses ----------
function keluarSesi(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
    }
    @session_destroy();
}

function tolakAkses(string $pesan = 'Silakan masuk dulu.'): void {
    respon(['success' => false, 'auth' => true, 'message' => $pesan], 401);
}

// Siswa harus login DAN akunnya masih berstatus aktif (dicek ke database tiap permintaan)
function wajibSiswa(): array {
    $u = $_SESSION['user'] ?? null;
    if (!$u || ($u['tipe'] ?? '') !== 'siswa') tolakAkses();
    $s = koneksi()->prepare('SELECT id, nama, nis, kelas, status FROM siswa WHERE id = ?');
    $s->execute([(int)$u['id']]);
    $r = $s->fetch();
    if (!$r || $r['status'] !== 'aktif') {
        keluarSesi();
        tolakAkses('Akun kamu tidak aktif. Hubungi admin.');
    }
    return $r;
}

function wajibAdmin(): array {
    $u = $_SESSION['user'] ?? null;
    if (!$u || ($u['tipe'] ?? '') !== 'admin') tolakAkses();
    $s = koneksi()->prepare('SELECT id, nama, email FROM admins WHERE id = ?');
    $s->execute([(int)$u['id']]);
    $r = $s->fetch();
    if (!$r) {
        keluarSesi();
        tolakAkses();
    }
    return $r;
}
