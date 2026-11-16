/* =========================================================
   INFO TELS — admin.js (halaman ADMIN)
   Membutuhkan common.js
   ========================================================= */

let data = [];
let activeCat = "semua";
let activeKelas = "semua";
let admin = null;
let siswaFilter = "pending";
let siswaData = [];
let siswaCounts = { pending: 0, aktif: 0, ditolak: 0 };
let konfirmasiAksi = null;
let pwTargetId = null;

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const authSub = document.getElementById("authSub");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

/* ---------------------------------------------------------
   Sesi habis -> kembali ke layar masuk
   --------------------------------------------------------- */
function sesiHabis(res){
  if (res && res.auth) {
    backToLogin("Sesi habis. Silakan masuk lagi.");
    return true;
  }
  return false;
}

/* ---------------------------------------------------------
   Tab
   --------------------------------------------------------- */
function showTab(name){
  const isSiswa = name === "siswa";
  document.getElementById("tabPengumuman").classList.toggle("active", !isSiswa);
  document.getElementById("tabSiswa").classList.toggle("active", isSiswa);
  document.getElementById("panelPengumuman").hidden = isSiswa;
  document.getElementById("panelSiswa").hidden = !isSiswa;
  document.getElementById("fab").classList.toggle("show", !isSiswa);
  if (isSiswa) muatSiswa();
  else muatData();
}
document.getElementById("tabPengumuman").addEventListener("click", () => showTab("pengumuman"));
document.getElementById("tabSiswa").addEventListener("click", () => showTab("siswa"));

/* ---------------------------------------------------------
   Pengumuman: filter, daftar, hapus
   --------------------------------------------------------- */
function buildKelasFilter(){
  const sel = document.getElementById("kelasFilter");
  sel.innerHTML = '<option value="semua">Semua Kelas/Jurusan</option>';
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
  sel.value = activeKelas;
}
document.getElementById("kelasFilter").addEventListener("change", e => {
  activeKelas = e.target.value;
  render();
});

function render(){
  const catLabels = {};
  Object.keys(CATS).forEach(k => { catLabels[k] = CATS[k].label; });
  buildChipsInto("chips", catLabels, activeCat, key => { activeCat = key; render(); });
  document.getElementById("kelasFilter").value = activeKelas;

  const filtered = data
    .filter(d =>
      (activeCat === "semua" || d.kategori === activeCat) &&
      (activeKelas === "semua" || d.kelas.includes(KELAS_ALL) || d.kelas.includes(activeKelas)))
    .slice()
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  document.getElementById("countLabel").textContent = filtered.length + " pengumuman";
  document.getElementById("grid").innerHTML = filtered.map(i => cardHtml(i, true)).join("");
  document.getElementById("emptyState").style.display = filtered.length ? "none" : "block";
}

document.getElementById("grid").addEventListener("click", e => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = parseInt(btn.getAttribute("data-id"), 10);
  tanyaHapus("Hapus Pengumuman?", "Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan.", async () => {
    const res = await postJson("pengumuman.php", { aksi: "hapus", id });
    if (!res.success) { if (!sesiHabis(res)) showToast(res.message || "Gagal menghapus"); return; }
    await muatData();
    showToast("Pengumuman berhasil dihapus");
  });
});

async function muatData(diam = false){
  try {
    const res = await getJson("pengumuman.php");
    if (res.success) { data = res.data.map(normalizeItem); render(); }
    else if (!sesiHabis(res) && !diam) showToast(res.message || "Gagal memuat pengumuman");
  } catch (err) {
    console.error(err);
    if (!diam) showToast("Gagal memuat pengumuman");
  }
}

/* ---------------------------------------------------------
   Konfirmasi hapus (dipakai pengumuman & siswa)
   --------------------------------------------------------- */
const confirmOverlay = document.getElementById("confirmOverlay");

function tanyaHapus(judul, teks, aksi){
  document.getElementById("confirmTitle").textContent = judul;
  document.getElementById("confirmText").textContent = teks;
  konfirmasiAksi = aksi;
  confirmOverlay.classList.add("show");
}
function tutupKonfirmasi(){
  confirmOverlay.classList.remove("show");
  konfirmasiAksi = null;
}
document.getElementById("confirmCancelBtn").addEventListener("click", tutupKonfirmasi);
confirmOverlay.addEventListener("click", e => { if (e.target === confirmOverlay) tutupKonfirmasi(); });
document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
  const aksi = konfirmasiAksi;
  tutupKonfirmasi();
  if (!aksi) return;
  try { await aksi(); }
  catch (err) { console.error(err); showToast(netError(err)); }
});

/* ---------------------------------------------------------
   Pilihan kelas (checkbox) di form pengumuman
   --------------------------------------------------------- */
const kelasAll = document.getElementById("kelasAll");
const kelasGroups = document.getElementById("kelasGroups");
const kelasHint = document.getElementById("kelasHint");

function kelasInputs(){ return kelasGroups.querySelectorAll('input[name="kelasItem"]'); }

function buildKelasPicker(){
  kelasGroups.innerHTML = "";
  Object.entries(groupKelas()).forEach(([tingkat, list]) => {
    const box = document.createElement("div");
    box.className = "kelas-group";
    box.innerHTML = `
      <div class="kelas-group-head">
        <span>Kelas ${tingkat}</span>
        <label class="kelas-group-all">
          <input type="checkbox" data-group="${tingkat}">
          <span>Pilih semua</span>
        </label>
      </div>
      <div class="kelas-options"></div>`;
    const opts = box.querySelector(".kelas-options");
    list.forEach(k => {
      const label = document.createElement("label");
      label.className = "kelas-check";
      label.title = k;
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "kelasItem";
      input.value = k;
      input.dataset.tingkat = tingkat;
      const span = document.createElement("span");
      span.textContent = k.slice(tingkat.length + 1);
      label.append(input, span);
      opts.appendChild(label);
    });
    kelasGroups.appendChild(box);
  });
}

function syncGroupBoxes(){
  kelasGroups.querySelectorAll("input[data-group]").forEach(g => {
    const items = [...kelasInputs()].filter(i => i.dataset.tingkat === g.dataset.group);
    const n = items.filter(i => i.checked).length;
    g.checked = n === items.length;
    g.indeterminate = n > 0 && n < items.length;
  });
}

function getSelectedKelas(){
  if (kelasAll.checked) return [KELAS_ALL];
  return [...kelasInputs()].filter(i => i.checked).map(i => i.value);
}

function updateKelasHint(){
  const n = getSelectedKelas().length;
  kelasHint.classList.remove("warn");
  if (kelasAll.checked) {
    kelasHint.textContent = "Pengumuman tampil untuk semua kelas.";
  } else if (n === 0) {
    kelasHint.textContent = "Pilih minimal satu kelas.";
    kelasHint.classList.add("warn");
  } else {
    kelasHint.textContent = "Hanya " + n + " kelas yang dipilih yang bisa melihat pengumuman ini.";
  }
}

function setKelasLocked(locked){
  kelasGroups.classList.toggle("is-locked", locked);
  kelasGroups.querySelectorAll("input").forEach(i => {
    if (locked) { i.checked = false; i.indeterminate = false; }
    i.disabled = locked;
  });
}

function resetKelasPicker(){
  kelasAll.checked = true;
  setKelasLocked(true);
  updateKelasHint();
}

kelasAll.addEventListener("change", () => {
  setKelasLocked(kelasAll.checked);
  updateKelasHint();
});

kelasGroups.addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.group) {
    kelasInputs().forEach(i => {
      if (i.dataset.tingkat === t.dataset.group) i.checked = t.checked;
    });
  }
  syncGroupBoxes();
  updateKelasHint();
});

/* ---------------------------------------------------------
   Form buat pengumuman
   --------------------------------------------------------- */
const overlay = document.getElementById("overlay");
const form = document.getElementById("form");

document.getElementById("fab").addEventListener("click", () => {
  form.reset();
  resetKelasPicker();
  overlay.classList.add("show");
});
document.getElementById("cancelBtn").addEventListener("click", () => overlay.classList.remove("show"));
overlay.addEventListener("click", e => { if (e.target === overlay) overlay.classList.remove("show"); });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const kelas = getSelectedKelas();
  if (kelas.length === 0) {
    showToast("Pilih minimal satu kelas");
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const res = await postJson("pengumuman.php", {
      aksi: "tambah",
      judul: document.getElementById("judul").value.trim(),
      isi: document.getElementById("isi").value.trim(),
      kategori: document.getElementById("kategori").value,
      kelas
    });
    if (!res.success) {
      if (sesiHabis(res)) { overlay.classList.remove("show"); return; }
      showToast(res.message || "Gagal memposting");
      return;
    }
    form.reset();
    resetKelasPicker();
    overlay.classList.remove("show");
    activeCat = "semua"; activeKelas = "semua";
    await muatData();
    showToast("Pengumuman berhasil diposting");
  } catch (err) {
    console.error(err);
    showToast(netError(err));
  } finally {
    btn.disabled = false;
  }
});

/* ---------------------------------------------------------
   Verifikasi siswa
   --------------------------------------------------------- */
function updatePendingBadge(){
  const b = document.getElementById("pendingBadge");
  b.textContent = siswaCounts.pending;
  b.classList.toggle("show", siswaCounts.pending > 0);
}

function renderSiswa(){
  const total = siswaCounts.pending + siswaCounts.aktif + siswaCounts.ditolak;
  const labels = {
    pending: "Menunggu (" + siswaCounts.pending + ")",
    aktif: "Aktif (" + siswaCounts.aktif + ")",
    ditolak: "Ditolak (" + siswaCounts.ditolak + ")",
    semua: "Semua (" + total + ")"
  };
  buildChipsInto("siswaChips", labels, siswaFilter, key => { siswaFilter = key; muatSiswa(); });

  const STATUS = { pending: "Menunggu", aktif: "Aktif", ditolak: "Ditolak" };
  const list = document.getElementById("siswaList");
  list.innerHTML = siswaData.map(s => {
    let aksi = "";
    if (s.status === "pending") {
      aksi = `<button class="btn btn-ok btn-sm" data-aksi="setujui" data-id="${s.id}">Setujui</button>
              <button class="btn btn-ghost btn-sm" data-aksi="tolak" data-id="${s.id}">Tolak</button>`;
    } else if (s.status === "aktif") {
      aksi = `<button class="btn btn-ghost btn-sm" data-aksi="reset" data-id="${s.id}">Reset password</button>
              <button class="btn btn-ghost btn-sm" data-aksi="tolak" data-id="${s.id}">Nonaktifkan</button>
              <button class="btn btn-danger btn-sm" data-aksi="hapus" data-id="${s.id}">Hapus</button>`;
    } else {
      aksi = `<button class="btn btn-ok btn-sm" data-aksi="setujui" data-id="${s.id}">Setujui</button>
              <button class="btn btn-danger btn-sm" data-aksi="hapus" data-id="${s.id}">Hapus</button>`;
    }
    return `
      <div class="siswa-item">
        <div class="siswa-info">
          <h3>${escapeHtml(s.nama)}</h3>
          <div class="siswa-meta">
            <span>NIS ${escapeHtml(s.nis)}</span>
            <span>Kelas ${escapeHtml(s.kelas)}</span>
            <span>Daftar ${timeAgo(s.tanggal).toLowerCase()}</span>
            <span class="status-pill ${s.status}">${STATUS[s.status]}</span>
          </div>
        </div>
        <div class="siswa-actions">${aksi}</div>
      </div>`;
  }).join("");

  document.getElementById("siswaCount").textContent = siswaData.length + " akun";
  document.getElementById("siswaEmpty").style.display = siswaData.length ? "none" : "block";
  updatePendingBadge();
}

async function muatSiswa(diam = false){
  try {
    const res = await getJson("siswa.php?status=" + encodeURIComponent(siswaFilter));
    if (res.success) {
      siswaData = res.data;
      siswaCounts = res.counts;
      renderSiswa();
    } else if (!sesiHabis(res) && !diam) showToast(res.message || "Gagal memuat data siswa");
  } catch (err) {
    console.error(err);
    if (!diam) showToast("Gagal memuat data siswa");
  }
}

async function aksiSiswa(aksi, id, extra = {}){
  const res = await postJson("siswa.php", { aksi, id, ...extra });
  if (!res.success) {
    if (!sesiHabis(res)) showToast(res.message || "Aksi gagal");
    return false;
  }
  return true;
}

document.getElementById("siswaList").addEventListener("click", async e => {
  const btn = e.target.closest("button[data-aksi]");
  if (!btn) return;
  const aksi = btn.dataset.aksi;
  const id = parseInt(btn.dataset.id, 10);
  const siswa = siswaData.find(s => s.id === id);
  if (!siswa) return;

  try {
    if (aksi === "setujui") {
      btn.disabled = true;
      if (await aksiSiswa("setujui", id)) { showToast(siswa.nama + " disetujui"); await muatSiswa(); }
      else btn.disabled = false;
    } else if (aksi === "tolak") {
      btn.disabled = true;
      if (await aksiSiswa("tolak", id)) { showToast("Akun " + siswa.nama + " dinonaktifkan"); await muatSiswa(); }
      else btn.disabled = false;
    } else if (aksi === "hapus") {
      tanyaHapus("Hapus akun siswa?", "Akun " + siswa.nama + " (NIS " + siswa.nis + ") akan dihapus permanen. Siswa harus mendaftar ulang kalau mau masuk lagi.", async () => {
        if (await aksiSiswa("hapus", id)) { showToast("Akun siswa dihapus"); await muatSiswa(); }
      });
    } else if (aksi === "reset") {
      pwTargetId = id;
      document.getElementById("pwSub").textContent = "Buat password baru untuk " + siswa.nama + ", lalu sampaikan ke siswanya.";
      document.getElementById("pwBaru").value = "";
      setMsg(document.getElementById("pwError"), "");
      document.getElementById("pwOverlay").classList.add("show");
      document.getElementById("pwBaru").focus();
    }
  } catch (err) {
    console.error(err);
    showToast(netError(err));
  }
});

/* Reset password */
const pwOverlay = document.getElementById("pwOverlay");
document.getElementById("pwCancelBtn").addEventListener("click", () => pwOverlay.classList.remove("show"));
pwOverlay.addEventListener("click", e => { if (e.target === pwOverlay) pwOverlay.classList.remove("show"); });
document.getElementById("pwSaveBtn").addEventListener("click", async () => {
  const baru = document.getElementById("pwBaru").value;
  const err = document.getElementById("pwError");
  if (baru.length < 6) { setMsg(err, "Password baru minimal 6 karakter."); return; }
  try {
    if (await aksiSiswa("reset_password", pwTargetId, { password: baru })) {
      pwOverlay.classList.remove("show");
      showToast("Password berhasil diubah");
    }
  } catch (e2) {
    console.error(e2);
    setMsg(err, netError(e2));
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { overlay.classList.remove("show"); pwOverlay.classList.remove("show"); tutupKonfirmasi(); }
});

/* ---------------------------------------------------------
   Masuk / daftar / keluar admin
   --------------------------------------------------------- */
function showAuthView(view){
  const isRegister = view === "register";
  loginView.hidden = isRegister;
  registerView.hidden = !isRegister;
  authSub.textContent = isRegister ? "Daftar akun admin" : "Masuk admin";
  setMsg(loginError, "");
  setMsg(registerError, "");
}
document.getElementById("showRegisterBtn").addEventListener("click", () => showAuthView("register"));
document.getElementById("showLoginBtn").addEventListener("click", () => showAuthView("login"));

function enterApp(user){
  admin = user;
  loginScreen.style.display = "none";
  appScreen.style.display = "block";
  document.getElementById("statusBadge").innerHTML = ICONS.crown + " " + escapeHtml(user.nama) + " · Admin";
  activeCat = "semua";
  activeKelas = "semua";
  data = [];
  render();
  showTab("pengumuman");
  muatSiswa(true); // untuk angka "menunggu verifikasi" di tab
}

function backToLogin(pesan = ""){
  admin = null;
  data = [];
  appScreen.style.display = "none";
  loginScreen.style.display = "flex";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
  overlay.classList.remove("show");
  pwOverlay.classList.remove("show");
  showAuthView("login");
  if (pesan) setMsg(loginError, pesan);
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await postJson("logout.php", {}); } catch (err) { console.error(err); }
  backToLogin();
});

const loginBtn = document.getElementById("loginBtn");
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  setMsg(loginError, "");
  if (!email || !password) {
    setMsg(loginError, "Email dan password wajib diisi.");
    return;
  }
  loginBtn.disabled = true;
  try {
    const result = await postJson("admin_login.php", { email, password });
    if (result.success) {
      enterApp(result);
      showToast("Masuk sebagai Admin");
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

const registerBtn = document.getElementById("registerBtn");
registerBtn.addEventListener("click", async () => {
  const nama = document.getElementById("regNama").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;
  const kode = document.getElementById("regKode").value.trim();
  setMsg(registerError, "");

  if (!nama || !email || !password || !confirm || !kode) {
    setMsg(registerError, "Semua kolom wajib diisi.");
    return;
  }
  if (password.length < 8) {
    setMsg(registerError, "Password admin minimal 8 karakter.");
    return;
  }
  if (password !== confirm) {
    setMsg(registerError, "Password dan ulangi password tidak sama.");
    return;
  }

  registerBtn.disabled = true;
  try {
    const result = await postJson("admin_daftar.php", { nama, email, password, kode });
    if (result.success) {
      ["regNama", "regEmail", "regPassword", "regConfirm", "regKode"].forEach(id => { document.getElementById(id).value = ""; });
      showAuthView("login");
      document.getElementById("loginEmail").value = email;
      setMsg(loginError, "Akun admin berhasil dibuat. Silakan masuk.", true);
      document.getElementById("loginPassword").focus();
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
document.getElementById("regKode").addEventListener("keydown", e => {
  if (e.key === "Enter") registerBtn.click();
});

/* ---------------------------------------------------------
   Inisialisasi
   --------------------------------------------------------- */
buildKelasFilter();
buildKelasPicker();
resetKelasPicker();

(async function pulihkanSesi(){
  try {
    const res = await getJson("sesi.php");
    if (res.success && res.tipe === "admin") enterApp(res);
  } catch (err) { /* belum login: tampilkan layar masuk */ }
})();

// Segarkan tiap 60 detik: pengumuman & jumlah siswa menunggu verifikasi
setInterval(() => {
  if (!admin || document.hidden) return;
  if (!document.getElementById("panelPengumuman").hidden) muatData(true);
  muatSiswa(true);
}, 60000);
