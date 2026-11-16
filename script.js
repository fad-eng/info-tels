/* =========================================================
   INFO TELS — script.js (halaman SISWA)
   Membutuhkan common.js
   ========================================================= */

let data = [];
let activeCat = "semua";
let me = null;

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const authSub = document.getElementById("authSub");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

/* ---------- Daftar pengumuman ---------- */
function render(){
  const catLabels = {};
  Object.keys(CATS).forEach(k => { catLabels[k] = CATS[k].label; });
  buildChipsInto("chips", catLabels, activeCat, key => { activeCat = key; render(); });

  const filtered = data
    .filter(d => activeCat === "semua" || d.kategori === activeCat)
    .slice()
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  document.getElementById("countLabel").textContent = filtered.length + " pengumuman";
  document.getElementById("grid").innerHTML = filtered.map(i => cardHtml(i, false)).join("");
  document.getElementById("emptyState").style.display = filtered.length ? "none" : "block";
}

async function muatData(diam = false){
  try {
    const res = await getJson("pengumuman.php");
    if (res.success) { data = res.data.map(normalizeItem); render(); }
    else if (res.auth) { backToLogin(res.message || "Sesi habis. Silakan masuk lagi."); }
    else if (!diam) showToast(res.message || "Gagal memuat pengumuman");
  } catch (err) {
    console.error(err);
    if (!diam) showToast("Gagal memuat pengumuman");
  }
}

/* ---------- Masuk / keluar ---------- */
function showAuthView(view){
  const isRegister = view === "register";
  loginView.hidden = isRegister;
  registerView.hidden = !isRegister;
  authSub.textContent = isRegister
    ? "Daftar akun siswa. Admin akan memverifikasi akunmu."
    : "Masuk dengan akun siswa untuk melihat info kelasmu";
  setMsg(loginError, "");
  setMsg(registerError, "");
}

document.getElementById("showRegisterBtn").addEventListener("click", () => showAuthView("register"));
document.getElementById("showLoginBtn").addEventListener("click", () => showAuthView("login"));

function enterApp(user){
  me = user;
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  document.getElementById("statusBadge").innerHTML =
    ICONS.user + " " + escapeHtml(user.nama) + " · " + escapeHtml(user.kelas);
  document.getElementById("heroSub").textContent =
    "Kamu hanya melihat info untuk kelas " + user.kelas + " dan info untuk semua kelas.";
  activeCat = "semua";
  data = [];
  render();
  muatData();
}

function backToLogin(pesan = ""){
  me = null;
  data = [];
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  document.getElementById("loginNis").value = "";
  document.getElementById("loginPassword").value = "";
  showAuthView("login");
  if (pesan) setMsg(loginError, pesan);
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await postJson("logout.php", {}); } catch (err) { console.error(err); }
  backToLogin();
});

const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", async () => {
  const nis = document.getElementById("loginNis").value.trim();
  const password = document.getElementById("loginPassword").value;
  setMsg(loginError, "");

  if (!nis || !password) {
    setMsg(loginError, "NIS dan password wajib diisi.");
    return;
  }

  loginBtn.disabled = true;
  try {
    const result = await postJson("login.php", { nis, password });
    if (result.success) {
      enterApp(result);
      showToast("Selamat datang, " + result.nama);
    } else {
      setMsg(loginError, result.message || "Login gagal.");
    }
  } catch (error) {
    console.error(error);
    setMsg(loginError, netError(error));
  } finally {
    loginBtn.disabled = false;
  }
});

document.getElementById("loginPassword").addEventListener("keydown", e => {
  if (e.key === "Enter") loginBtn.click();
});

/* ---------- Daftar akun siswa ---------- */
function buildKelasSelect(){
  const sel = document.getElementById("regKelas");
  sel.innerHTML = '<option value="" disabled selected>Pilih kelas</option>';
  Object.entries(groupKelas()).forEach(([tingkat, list]) => {
    const og = document.createElement("optgroup");
    og.label = "Kelas " + tingkat;
    list.forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", async () => {
  const nama = document.getElementById("regNama").value.trim();
  const nis = document.getElementById("regNis").value.trim();
  const kelas = document.getElementById("regKelas").value;
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;
  setMsg(registerError, "");

  if (!nama || !nis || !kelas || !password || !confirm) {
    setMsg(registerError, "Semua kolom wajib diisi.");
    return;
  }
  if (!/^[A-Za-z0-9]{4,20}$/.test(nis)) {
    setMsg(registerError, "NIS harus 4–20 karakter, hanya huruf dan angka.");
    return;
  }
  if (password.length < 6) {
    setMsg(registerError, "Password minimal 6 karakter.");
    return;
  }
  if (password !== confirm) {
    setMsg(registerError, "Password dan ulangi password tidak sama.");
    return;
  }

  registerBtn.disabled = true;
  try {
    const result = await postJson("register.php", { nama, nis, kelas, password });
    if (result.success) {
      ["regNama", "regNis", "regPassword", "regConfirm"].forEach(id => { document.getElementById(id).value = ""; });
      document.getElementById("regKelas").value = "";
      showAuthView("login");
      document.getElementById("loginNis").value = nis;
      setMsg(loginError, result.message, true);
    } else {
      setMsg(registerError, result.message || "Pendaftaran gagal.");
    }
  } catch (error) {
    console.error(error);
    setMsg(registerError, netError(error));
  } finally {
    registerBtn.disabled = false;
  }
});

document.getElementById("regConfirm").addEventListener("keydown", e => {
  if (e.key === "Enter") registerBtn.click();
});

/* ---------- Inisialisasi ---------- */
buildKelasSelect();

(async function pulihkanSesi(){
  try {
    const res = await getJson("sesi.php");
    if (res.success && res.tipe === "siswa") enterApp(res);
  } catch (err) { /* belum login: tampilkan layar masuk */ }
})();

// Segarkan daftar tiap 60 detik agar info baru muncul sendiri
setInterval(() => { if (me && !document.hidden) muatData(true); }, 60000);
