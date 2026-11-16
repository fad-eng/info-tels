/* =========================================================
   INFO TELS — common.js (dipakai halaman siswa dan admin)
   ========================================================= */

const ICONS = {
  user: '<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="3.2"/><path d="M3.5 17c1-3.2 3.7-5 6.5-5s5.5 1.8 6.5 5"/></svg>',
  crown: '<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14.5h14M3.8 14.5 3 7l3.6 2.6L10 5l3.4 4.6L17 7l-.8 7.5"/></svg>',
};

const CATS = {
  semua:   { label: "Semua",    color: "#0F1A3D", bg: "#E8ECFF" },
  akademik:{ label: "Akademik", color: "#3358FF", bg: "#E8ECFF" },
  lomba:   { label: "Lomba",    color: "#D97706", bg: "#FFF1DB" },
  libur:   { label: "Libur",    color: "#0F9D82", bg: "#DDF7F0" },
  ekskul:  { label: "Ekskul",   color: "#E0457B", bg: "#FFE6EF" },
};

const KELAS_ALL = "Semua Kelas";
const KELAS_LIST = [
  "X RPL 1", "X RPL 2", "X RPL 3", "X TKJ 1", "X TKJ 2", "X DKV 1", "X DKV 2", "X Transmisi",
  "XI RPL 1", "XI RPL 2", "XI RPL 3", "XI RPL 4", "XI TKJ 1", "XI TKJ 2", "XI DKV 1", "XI DKV 2", "XI Transmisi",
  "XII RPL 1", "XII RPL 2", "XII RPL 3", "XII TKJ 1", "XII TKJ 2", "XII DKV 1", "XII DKV 2", "XII Transmisi"
];

function groupKelas(){
  const groups = {};
  KELAS_LIST.forEach(k => {
    const tingkat = k.split(" ")[0];
    (groups[tingkat] = groups[tingkat] || []).push(k);
  });
  return groups;
}

function normalizeItem(d){
  return { ...d, kelas: Array.isArray(d.kelas) ? d.kelas : [d.kelas || KELAS_ALL] };
}

function escapeHtml(str){
  const d = document.createElement("div");
  d.textContent = String(str == null ? "" : str);
  return d.innerHTML.replace(/"/g, "&quot;");
}

/* ---------- Komunikasi dengan server ---------- */
async function requestJson(url, options = {}){
  if (location.protocol === "file:") throw new Error("FILE_PROTOCOL");
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch {
    console.error("Balasan server bukan JSON (kode " + res.status + "):", text.slice(0, 300));
    throw new Error("BAD_RESPONSE:" + res.status);
  }
}
function postJson(url, body){
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
function getJson(url){ return requestJson(url); }

function netError(err){
  const m = String(err && err.message || "");
  if (m === "FILE_PROTOCOL") {
    return "Halaman dibuka dari file. Buka lewat alamat situsnya (http/https), bukan klik dua kali.";
  }
  if (m.startsWith("BAD_RESPONSE")) {
    return "Server membalas dengan format yang tidak dikenal (kode " + m.split(":")[1] + "). Coba lagi sebentar lagi. Kalau terus berulang, hubungi admin.";
  }
  return "Tidak bisa menghubungi server. Periksa koneksi internet lalu coba lagi.";
}

/* ---------- Tampilan umum ---------- */
function setMsg(el, text, ok = false){
  el.textContent = text;
  el.classList.toggle("ok", ok);
}

let toastTimer;
function showToast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

function timeAgo(dateStr){
  const diff = Math.floor((new Date() - new Date(dateStr + "T00:00:00")) / 86400000);
  if (diff <= 0) return "Hari ini";
  if (diff === 1) return "1 hari lalu";
  return diff + " hari lalu";
}

function kelasPillsHtml(list){
  if (list.includes(KELAS_ALL)) {
    return '<span class="kelas-pill kelas-pill-all">Semua Kelas</span>';
  }
  const MAX = 3;
  const shown = list.slice(0, MAX)
    .map(k => `<span class="kelas-pill">${escapeHtml(k)}</span>`).join("");
  const extra = list.length > MAX
    ? `<span class="kelas-pill kelas-pill-more" title="${escapeHtml(list.slice(MAX).join(", "))}">+${list.length - MAX}</span>`
    : "";
  return shown + extra;
}

function cardHtml(item, canDelete){
  const c = CATS[item.kategori] || CATS.akademik;
  const del = canDelete
    ? `<button class="delete-btn btn-103 show" data-id="${item.id}" aria-label="Hapus pengumuman"><span class="text-103">Hapus</span><span class="icon-103"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"></path></svg></span></button>`
    : "";
  return `
    <div class="card" style="--cat-color:${c.color}; --cat-bg:${c.bg};">
      <div class="card-top"><span class="tag">${c.label}</span></div>
      <h3>${escapeHtml(item.judul)}</h3>
      <p>${escapeHtml(item.isi)}</p>
      <div class="card-meta">
        <div class="kelas-list">${kelasPillsHtml(item.kelas)}</div>
        <span>${timeAgo(item.tanggal)}</span>
      </div>
      ${del}
    </div>`;
}

function buildChipsInto(wrapId, cats, active, onPick){
  const wrap = document.getElementById(wrapId);
  wrap.innerHTML = "";
  Object.keys(cats).forEach(key => {
    const b = document.createElement("button");
    b.className = "chip" + (key === active ? " active" : "");
    b.textContent = cats[key];
    b.setAttribute("aria-pressed", key === active);
    b.addEventListener("click", () => onPick(key));
    wrap.appendChild(b);
  });
}
