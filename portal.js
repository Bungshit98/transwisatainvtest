/* ==========================================================
   Portal Transwisata: login username + PIN, 5 peran
   owner, dev, admin, mandor, sopir. Data lokal (localStorage).
   ========================================================== */
(function () {
    'use strict';

    const KATEGORI = ['BBM', 'Parkir', 'Uang Makan', 'Tiket', 'Lain-lain'];
    const ARMADA_STATUS = ['Siap', 'Dipakai', 'Servis'];
    const SOPIR_STATUS = ['Aktif', 'Nonaktif'];
    const WA_KANTOR = '6287767630035';
    const KEY = {
        akun: 'tw_akun', master: 'tw_master', pengeluaran: 'tw_pengeluaran',
        history: 'tw_history', booking: 'tw_booking', session: 'tw_session'
    };
    const ROLE_LABEL = { owner: 'Owner', dev: 'Developer', admin: 'Admin', mandor: 'Mandor', sopir: 'Sopir' };
    const LAPANGAN = ['jadwal', 'pengeluaran', 'pin'];
    const VIEWS = {
        owner: ['dashboard', 'invoices', 'generator', 'jadwal', 'pengeluaran', 'rekap', 'armada', 'supir', 'keuangan', 'arsip', 'akun', 'pin'],
        dev: ['dashboard', 'invoices', 'generator', 'jadwal', 'pengeluaran', 'rekap', 'armada', 'supir', 'keuangan', 'arsip', 'akun', 'pin'],
        admin: ['dashboard', 'invoices', 'generator', 'jadwal', 'pengeluaran', 'rekap', 'armada', 'supir', 'keuangan', 'arsip', 'pin'],
        mandor: ['jadwal', 'pin'],
        sopir: ['pengeluaran', 'jadwal', 'pin']
    };
    const CEK_ITEMS = ['BBM cukup', 'Ban & angin', 'Lampu & wiper', 'Kebersihan', 'Dokumen (STNK, KIR, SIM)', 'Kondisi driver siap'];
    const FASE = { pre: 'Sebelum berangkat', post: 'Setelah pulang' };
    const STAT_CLASS = {
        'Menunggu tugas': 'bg-rose-100 text-rose-700', 'Ditugaskan': 'bg-amber-100 text-amber-700',
        'Berjalan': 'bg-blue-100 text-blue-700', 'Selesai jalan': 'bg-violet-100 text-violet-700',
        'Selesai': 'bg-emerald-100 text-emerald-700'
    };

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
    const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
    const thisMonth = () => today().slice(0, 7);
    const fmtTgl = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
    const uid = () => Math.random().toString(36).slice(2, 10);
    const opts = (list, sel) => (list || []).map((x) => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const optsStatus = (list, sel) => list.map((x) => `<option ${x === sel ? 'selected' : ''}>${x}</option>`).join('');
    const validPin = (p) => /^\d{4,}$/.test(p);
    const badge = (s) => `<span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${STAT_CLASS[s] || 'bg-slate-100'}">${s}</span>`;

    function load(k, fb) {
        try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; }
        catch (e) { return fb; }
    }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    function toast(msg, type) {
        const box = $('toast-container');
        if (!box) return;
        const t = document.createElement('div');
        t.className = 'text-white text-sm px-4 py-2.5 rounded-lg shadow-lg transition-opacity duration-300 ' + (type === 'err' ? 'bg-rose-600' : 'bg-slate-900');
        t.textContent = msg;
        box.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2600);
    }

    /* ---------- Akun ---------- */
    function getAkun() {
        let list = load(KEY.akun, null);
        if (!list) {
            const legacy = load('tw_auth', {});
            list = [
                { id: 'owner', username: 'owner', nama: 'Owner', role: 'owner', pin: '4444', aktif: true },
                { id: 'dev', username: 'dev', nama: 'Developer', role: 'dev', pin: '9999', aktif: true },
                { id: 'admin', username: 'admin', nama: 'Admin', role: 'admin', pin: String(legacy.admin || '3333'), aktif: true },
                { id: 'mandor', username: 'mandor', nama: 'Mandor', role: 'mandor', pin: String(legacy.mandor || '2222'), aktif: true }
            ];
            save(KEY.akun, list);
        }
        return list;
    }
    function saveAkun(list) { save(KEY.akun, list); }

    /* ---------- Master ---------- */
    function getMaster() {
        const raw = load(KEY.master, {});
        const sopir = (raw.sopir || []).map((s) => typeof s === 'string'
            ? { nama: s, hp: '', sim: '', simExp: '', status: 'Aktif' }
            : { nama: '', hp: '', sim: '', simExp: '', status: 'Aktif', ...s });
        const mobil = (raw.mobil || []).map((m) => typeof m === 'string'
            ? { plat: m, tipe: '', seat: '', status: 'Siap', stnkExp: '', kirExp: '' }
            : { plat: '', tipe: '', seat: '', status: 'Siap', stnkExp: '', kirExp: '', ...m });
        return { sopir, mobil };
    }
    function saveMaster(m) { save(KEY.master, m); }
    const namaSopir = (m) => m.sopir.map((s) => s.nama);
    const platMobil = (m) => m.mobil.map((x) => x.plat);

    function totals(inv) {
        const grand = (inv.items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.days) || 0) * (Number(i.price) || 0), 0);
        let dp = inv.status === 'LUNAS' ? grand : inv.status === 'UNPAID' ? 0 : (Number(inv.dp) || 0);
        dp = Math.min(Math.max(dp, 0), grand);
        return { grand, dp, balance: grand - dp };
    }
    function daysLeft(s) {
        if (!s) return null;
        const d = new Date(s + 'T00:00:00');
        const now = new Date(); now.setHours(0, 0, 0, 0);
        return Math.round((d - now) / 86400000);
    }
    function expBadge(s) {
        const d = daysLeft(s);
        if (d === null) return '<span class="text-slate-400">belum diisi</span>';
        if (d < 0) return `<span class="text-rose-600 font-semibold">Kedaluwarsa ${fmtTgl(s)}</span>`;
        if (d <= 30) return `<span class="text-amber-600 font-semibold">${fmtTgl(s)} (${d} hari lagi)</span>`;
        return `<span class="text-slate-600">${fmtTgl(s)}</span>`;
    }
    const getBooking = () => load(KEY.booking, []);
    const saveBooking = (list) => save(KEY.booking, list);

    /* ---------- Sesi & login ---------- */
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(KEY.session)); } catch (e) { session = null; }

    window.portalLogin = function () {
        const u = $('login-user').value.trim().toLowerCase();
        const pin = $('login-pin').value.trim();
        const msg = (t) => { $('login-msg').textContent = t; };
        const a = getAkun().find((x) => x.username === u);
        if (!a || String(a.pin) !== pin) return msg('Username atau PIN salah');
        if (a.aktif === false) return msg('Akun ini sedang nonaktif. Hubungi owner.');
        session = { id: a.id, role: a.role, nama: a.nama, username: a.username };
        sessionStorage.setItem(KEY.session, JSON.stringify(session));
        $('login-pin').value = '';
        msg('');
        startApp();
    };

    window.portalLogout = function () {
        session = null;
        sessionStorage.removeItem(KEY.session);
        document.body.classList.remove('role-owner', 'role-dev', 'role-admin', 'role-mandor', 'role-sopir');
        $('login-screen').classList.remove('hidden');
        $('login-user').focus();
    };

    function startApp() {
        $('login-screen').classList.add('hidden');
        document.body.classList.remove('role-owner', 'role-dev', 'role-admin', 'role-mandor', 'role-sopir');
        document.body.classList.add('role-' + session.role);
        const allowed = VIEWS[session.role];
        document.querySelectorAll('.nav-btn').forEach((b) => {
            b.style.display = allowed.indexOf(b.dataset.nav) === -1 ? 'none' : '';
        });
        const lbl = { admin: 'Booking', mandor: 'Penugasan & Cek', sopir: 'Jadwal Saya', owner: 'Booking', dev: 'Booking' }[session.role];
        const jb = document.querySelector('.nav-btn[data-nav="jadwal"]');
        if (jb) jb.textContent = lbl;
        const pb = $('btn-print');
        if (pb) pb.classList.toggle('hidden', !(session.role === 'owner' || session.role === 'dev'));
        $('sidebar-company').textContent = ROLE_LABEL[session.role] + ': ' + session.nama;
        showView(allowed[0]);
    }

    /* ---------- Booking & Jadwal ---------- */
    function bookingStatus(b) {
        if (!b.mobil || !b.sopir) return 'Menunggu tugas';
        const done = b.progres.filter((p) => p.done).length;
        if (done === 0) return 'Ditugaskan';
        if (done < b.progres.length) return 'Berjalan';
        if (b.cek && b.cek.post && b.cek.post.diterimaAt) return 'Selesai';
        return 'Selesai jalan';
    }
    function cekRingkas(b, fase) {
        const c = (b.cek && b.cek[fase]) || {};
        const n = CEK_ITEMS.filter((i) => c[i]).length;
        return n === CEK_ITEMS.length
            ? '<span class="text-emerald-700 font-semibold">Lengkap</span>'
            : `<span class="text-slate-500">${n}/${CEK_ITEMS.length} item</span>`;
    }
    const nowJam = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    function renderJadwal() {
        const role = session.role;
        if (role === 'admin' || role === 'owner' || role === 'dev') return renderBookingAdmin();
        if (role === 'mandor') return renderBookingMandor();
        return renderJadwalSopir();
    }

    const openBooking = new Set();

    function bookingDetail(b) {
        const cekRow = (fase) => {
            const c = (b.cek && b.cek[fase]) || {};
            return `<div>
                <p class="font-semibold text-slate-800">Cek ${FASE[fase]}</p>
                <p class="text-xs text-slate-600">${CEK_ITEMS.map((i) => (c[i] ? '✓ ' : '✗ ') + esc(i)).join(' · ')}</p>
                ${c.catatan ? `<p class="text-xs text-slate-500">Catatan: ${esc(c.catatan)}</p>` : ''}
            </div>`;
        };
        return `
            <div class="mt-3 border-t border-slate-100 pt-3 space-y-3 text-sm">
                <p><span class="text-slate-500">HP:</span> ${esc(b.hp || '-')} · <span class="text-slate-500">Invoice:</span> ${esc(b.invoice || '-')}</p>
                <div>
                    <p class="font-semibold text-slate-800 mb-1">Tujuan</p>
                    ${b.tujuan.map((t, i) => {
                        const p = b.progres[i] || {};
                        return `<p>${i + 1}. ${esc(t)} <span class="text-xs text-slate-500">${p.done ? '· selesai ' + esc(p.jam) : '· belum'}</span></p>`;
                    }).join('')}
                </div>
                ${cekRow('pre')}
                ${cekRow('post')}
                <button data-bdel="${esc(b.id)}" class="text-xs text-rose-600 hover:underline">Hapus booking</button>
            </div>`;
    }

    function renderBookingAdmin() {
        if (!$('jadwal-cari')) {
            $('jadwal-form').innerHTML = `
                <div class="card mb-4">
                    <span class="label">Cari booking</span>
                    <input id="jadwal-cari" class="field" placeholder="Customer, invoice, unit, sopir, tujuan, atau tanggal (YYYY-MM-DD)">
                </div>`;
        }
        const cari = ($('jadwal-cari').value || '').toLowerCase().trim();
        const list = getBooking()
            .filter((b) => bookingStatus(b) !== 'Selesai')
            .filter((b) => !cari || [b.customer, b.hp, b.invoice, b.mobil, b.sopir, b.tanggal, b.tujuan.join(' ')].join(' ').toLowerCase().indexOf(cari) !== -1)
            .sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal)));
        $('jadwal-list').innerHTML = list.length ? list.map((b) => {
            const done = b.progres.filter((p) => p.done).length;
            const open = openBooking.has(b.id);
            return `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(b.tanggal)} · ${esc(b.customer)}</p>
                        <p class="text-sm text-slate-500">${b.mobil ? esc(b.mobil) + ' · ' + esc(b.sopir) : 'Belum ditugaskan mandor'} · Invoice ${esc(b.invoice || '-')}</p>
                    </div>
                    ${badge(bookingStatus(b))}
                </div>
                <p class="text-sm mt-2">Progres: ${done}/${b.progres.length} tujuan · Cek sebelum: ${cekRingkas(b, 'pre')} · Cek sesudah: ${cekRingkas(b, 'post')}</p>
                <button data-toggle-detail="${esc(b.id)}" class="text-xs text-blue-700 hover:underline mt-2">${open ? 'Tutup detail' : 'Lihat detail'}</button>
                ${open ? bookingDetail(b) : ''}
            </div>`;
        }).join('') : '<div class="text-center text-slate-400 py-10">Tidak ada booking yang cocok.</div>';
    }

    window.portalSaveBooking = function () {
        const tujuan = $('b-tuj').value.split('\n').map((s) => s.trim()).filter(Boolean);
        const d = {
            id: uid(), tanggal: $('b-tgl').value, customer: $('b-cust').value.trim(),
            hp: $('b-hp').value.trim(), invoice: $('b-inv').value.trim(), tujuan,
            mobil: '', sopir: '', progres: tujuan.map(() => ({ done: false, jam: '' })),
            cek: { pre: {}, post: {} }, dibuat: new Date().toISOString()
        };
        if (!d.tanggal || !d.customer || !tujuan.length) return toast('Tanggal, customer, dan minimal satu tujuan wajib diisi', 'err');
        const list = getBooking();
        list.push(d);
        saveBooking(list);
        toast('Booking tersimpan');
        renderJadwal();
    };

    function renderBookingMandor() {
        const m = getMaster();
        $('jadwal-form').innerHTML = '';
        const list = getBooking()
            .filter((b) => bookingStatus(b) !== 'Selesai')
            .sort((a, c) => String(a.tanggal).localeCompare(String(c.tanggal)));
        if (!list.length) { $('jadwal-list').innerHTML = '<div class="text-center text-slate-400 py-10">Tidak ada booking yang perlu disiapkan.</div>'; return; }

        const cekForm = (b, fase) => {
            const c = (b.cek && b.cek[fase]) || {};
            return `
            <div class="mt-4 border-t border-slate-100 pt-3">
                <p class="font-semibold text-sm text-slate-800 mb-2">Cek unit: ${FASE[fase]}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${CEK_ITEMS.map((item) => `
                        <label class="flex items-center gap-2 m-0 text-sm font-normal normal-case tracking-normal text-slate-700">
                            <input type="checkbox" data-cek-id="${esc(b.id)}" data-cek-fase="${fase}" data-cek-item="${esc(item)}" ${c[item] ? 'checked' : ''} class="w-4 h-4">
                            ${esc(item)}
                        </label>`).join('')}
                </div>
                <textarea id="cat-${esc(b.id)}-${fase}" rows="2" class="field mt-2" placeholder="Catatan kondisi unit (opsional)">${esc(c.catatan || '')}</textarea>
                <button data-cek-save="${esc(b.id)}" data-cek-fase="${fase}" class="btn mt-2 text-sm">Simpan ${FASE[fase]}</button>
            </div>`;
        };

        $('jadwal-list').innerHTML = list.map((b) => {
            const assigned = !!(b.mobil && b.sopir);
            return `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(b.tanggal)} · ${esc(b.customer)}</p>
                        <p class="text-sm text-slate-500">${assigned ? esc(b.mobil) + ' · ' + esc(b.sopir) : 'Belum ditugaskan'}</p>
                    </div>
                    ${badge(bookingStatus(b))}
                </div>
                <p class="text-sm mt-2">Tujuan: ${b.tujuan.map(esc).join(' → ')}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <select id="as-mobil-${esc(b.id)}" class="field">${opts(platMobil(m), b.mobil)}</select>
                    <select id="as-sopir-${esc(b.id)}" class="field">${opts(namaSopir(m), b.sopir)}</select>
                    <button data-assign="${esc(b.id)}" class="btn btn-primary sm:col-span-2">${assigned ? 'Ubah Penugasan' : 'Tugaskan'}</button>
                </div>
                ${assigned ? cekForm(b, 'pre') + cekForm(b, 'post') : ''}
            </div>`;
        }).join('');
    }

    function renderJadwalSopir() {
        $('jadwal-form').innerHTML = '';
        const list = getBooking()
            .filter((b) => b.sopir === session.nama && bookingStatus(b) !== 'Selesai')
            .sort((a, c) => String(a.tanggal).localeCompare(String(c.tanggal)));
        const bantuan = `
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <p class="font-semibold text-amber-900">Ada kendala di jalan?</p>
                <p class="text-sm text-amber-800 mb-3">Misalnya ban bocor atau jemputan urgent.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                    <a href="tel:+${WA_KANTOR}" class="btn btn-dark text-center">Telepon Kantor</a>
                    <a href="https://wa.me/${WA_KANTOR}?text=${encodeURIComponent('Halo, saya ' + session.nama + ' (sopir). Ada kendala di jalan.')}" target="_blank" class="btn btn-primary text-center">WhatsApp Kantor</a>
                </div>
            </div>`;
        const riwayat = getBooking()
            .filter((b) => b.sopir === session.nama && bookingStatus(b) === 'Selesai')
            .sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal)));
        const riwayatHtml = riwayat.length ? `
            <p class="sec-title mt-6">Riwayat Kerja Saya</p>
            ${riwayat.map((b) => `
                <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
                    <p class="font-semibold text-slate-900">${fmtTgl(b.tanggal)} · ${esc(b.customer)}</p>
                    <p class="text-sm text-slate-500">Unit: ${esc(b.mobil)} · ${b.progres.filter((p) => p.done).length}/${b.progres.length} tujuan selesai</p>
                    <div class="text-sm text-slate-700 mt-2">${b.tujuan.map((t, i) => `<p>${i + 1}. ${esc(t)} <span class="text-xs text-slate-400">${esc((b.progres[i] || {}).jam || '')}</span></p>`).join('')}</div>
                </div>`).join('')}` : '';
        if (!list.length) { $('jadwal-list').innerHTML = bantuan + '<div class="text-center text-slate-400 py-10">Belum ada tugas untuk Anda.</div>' + riwayatHtml; return; }
        $('jadwal-list').innerHTML = bantuan + list.map((b) => `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(b.tanggal)} · ${esc(b.customer)}</p>
                        <p class="text-sm text-slate-500">Unit: ${esc(b.mobil)} · Cek sebelum berangkat: ${cekRingkas(b, 'pre')}</p>
                        ${bookingStatus(b) === 'Selesai jalan' ? '<p class="text-sm text-violet-700 mt-1">Semua tujuan sudah dicentang. Menunggu mandor cek unit di pool.</p>' : ''}
                    </div>
                    ${badge(bookingStatus(b))}
                </div>
                <div class="mt-3">
                    ${b.tujuan.map((t, i) => {
                        const p = b.progres[i] || { done: false, jam: '' };
                        return `
                        <label class="flex items-center gap-3 py-2 border-t border-slate-100 m-0 normal-case tracking-normal font-normal text-base text-slate-800">
                            <input type="checkbox" data-tuj-id="${esc(b.id)}" data-tuj-idx="${i}" ${p.done ? 'checked' : ''} class="w-5 h-5 shrink-0">
                            <span class="flex-1 ${p.done ? 'line-through text-slate-400' : ''}">${i + 1}. ${esc(t)}</span>
                            <span class="text-xs text-slate-500 shrink-0">${esc(p.jam)}</span>
                        </label>`;
                    }).join('')}
                </div>
            </div>`).join('') + riwayatHtml;
    }

    function handleAssign(id) {
        const mobil = $('as-mobil-' + id).value;
        const sopir = $('as-sopir-' + id).value;
        if (!mobil || !sopir) return toast('Pilih unit dan sopir dulu', 'err');
        const list = getBooking();
        const b = list.find((x) => x.id === id);
        if (!b) return;
        b.mobil = mobil;
        b.sopir = sopir;
        saveBooking(list);
        toast('Penugasan disimpan');
        renderJadwal();
    }
    function handleCekSave(id, fase) {
        const list = getBooking();
        const b = list.find((x) => x.id === id);
        if (!b) return;
        const c = {};
        document.querySelectorAll(`input[data-cek-id="${id}"][data-cek-fase="${fase}"]`).forEach((cb) => { c[cb.dataset.cekItem] = cb.checked; });
        c.catatan = ($('cat-' + id + '-' + fase) || {}).value || '';
        if (fase === 'post') c.diterimaAt = new Date().toISOString();
        b.cek = b.cek || { pre: {}, post: {} };
        b.cek[fase] = c;
        saveBooking(list);
        toast('Cek ' + FASE[fase].toLowerCase() + ' tersimpan');
        renderJadwal();
    }
    function handleTujuan(id, idx, checked) {
        const list = getBooking();
        const b = list.find((x) => x.id === id);
        if (!b) return;
        b.progres[idx] = { done: checked, jam: checked ? nowJam() : '' };
        saveBooking(list);
        renderJadwal();
    }

    /* ---------- Arsip booking (owner, dev, admin) ---------- */
    function renderArsip() {
        const cari = ($('arsip-cari').value || '').toLowerCase().trim();
        const list = getBooking()
            .filter((b) => bookingStatus(b) === 'Selesai')
            .filter((b) => !cari || [b.customer, b.mobil, b.sopir, b.invoice, b.tanggal].join(' ').toLowerCase().indexOf(cari) !== -1)
            .sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal)));
        $('arsip-list').innerHTML = list.length ? list.map((b) => `
            <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(b.tanggal)} · ${esc(b.customer)}</p>
                        <p class="text-sm text-slate-500">${esc(b.mobil)} · ${esc(b.sopir)} · Invoice: ${esc(b.invoice || '-')}</p>
                    </div>
                    ${badge('Selesai')}
                </div>
                <div class="mt-2 text-sm text-slate-700">
                    ${b.tujuan.map((t, i) => `<p>${i + 1}. ${esc(t)} <span class="text-xs text-slate-400">${esc((b.progres[i] || {}).jam || '')}</span></p>`).join('')}
                </div>
                <p class="text-xs text-slate-500 mt-2">Cek sebelum: ${cekRingkas(b, 'pre')} · Cek sesudah: ${cekRingkas(b, 'post')}</p>
            </div>`).join('') : '<div class="text-center text-slate-400 py-10">Belum ada booking yang selesai.</div>';
    }

    /* ---------- Pengeluaran ---------- */
    function renderPengeluaran() {
        const role = session.role;
        const m = getMaster();
        let list = load(KEY.pengeluaran, []);
        if (role === 'sopir') list = list.filter((p) => p.sopir === session.nama);
        list = list.slice().sort((a, c) => String(c.tanggal).localeCompare(String(a.tanggal))).slice(0, 200);
        const admin = role !== 'sopir' && role !== 'mandor';
        const sopirField = admin
            ? `<div><span class="label">Sopir</span><select id="p-sopir" class="field">${opts(namaSopir(m))}</select></div>`
            : `<div><span class="label">Sopir</span><input class="field" value="${esc(session.nama)}" disabled></div>`;
        $('pengeluaran-form').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Input Pengeluaran</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Tanggal</span><input type="date" id="p-tgl" class="field" value="${today()}"></div>
                    ${sopirField}
                    <div><span class="label">Mobil</span><select id="p-mobil" class="field">${opts(platMobil(m))}</select></div>
                    <div><span class="label">Kategori</span><select id="p-kat" class="field">${opts(KATEGORI)}</select></div>
                    <div class="sm:col-span-2"><span class="label">Keterangan</span><input id="p-ket" class="field" placeholder="Contoh: tambal ban, tambah angin, tol"></div>
                    <div class="sm:col-span-2"><span class="label">Nominal (Rp)</span><input type="number" id="p-nom" class="field" min="0"></div>
                </div>
                <button onclick="portalSaveExpense()" class="btn btn-primary">Simpan Pengeluaran</button>
            </div>`;
        $('pengeluaran-list').innerHTML = list.length
            ? '<div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">' + list.map((p) => `
                <div class="p-4 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(p.tanggal)} · ${esc(p.kategori)}</p>
                        <p class="text-sm text-slate-500">${esc(p.mobil)} · ${esc(p.sopir)}${p.keterangan ? ' · ' + esc(p.keterangan) : ''}</p>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-semibold text-slate-900">${rp(p.nominal)}</p>
                        ${admin ? `<button data-pdel="${esc(p.id)}" class="text-xs text-rose-600 hover:underline">Hapus</button>` : ''}
                    </div>
                </div>`).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada pengeluaran.</div>';
    }
    window.portalSaveExpense = function () {
        const d = {
            id: uid(), tanggal: $('p-tgl').value,
            sopir: session.role === 'sopir' ? session.nama : $('p-sopir').value,
            mobil: $('p-mobil').value, kategori: $('p-kat').value,
            keterangan: $('p-ket').value.trim(), nominal: Number($('p-nom').value) || 0
        };
        if (!d.tanggal || !d.sopir || !d.mobil) return toast('Tanggal, sopir, dan mobil wajib diisi', 'err');
        if (d.nominal <= 0) return toast('Nominal harus lebih dari 0', 'err');
        const list = load(KEY.pengeluaran, []);
        list.push(d);
        save(KEY.pengeluaran, list);
        toast('Pengeluaran tersimpan');
        renderPengeluaran();
    };

    /* ---------- Rekap ---------- */
    function groupSum(items, key) {
        const acc = {};
        items.forEach((p) => { acc[p[key]] = (acc[p[key]] || 0) + Number(p.nominal || 0); });
        return Object.keys(acc).map((k) => ({ nama: k, total: acc[k] })).sort((a, b) => b.total - a.total);
    }
    function tableCard(title, rows, tipe) {
        const body = rows.length
            ? rows.map((r) => `<tr class="border-t border-slate-100 ${tipe ? 'cursor-pointer hover:bg-slate-50' : ''}" ${tipe ? `data-dtipe="${tipe}" data-dnama="${esc(r.nama)}"` : ''}><td class="py-2">${esc(r.nama)}${tipe ? ' <span class="text-xs text-blue-600">detail</span>' : ''}</td><td class="py-2 text-right font-semibold">${rp(r.total)}</td></tr>`).join('')
            : '<tr><td class="py-4 text-center text-slate-400">Tidak ada data</td></tr>';
        return `<div class="card"><p class="sec-title">${title}</p><table class="w-full text-sm">${body}</table></div>`;
    }
    function renderRekap() {
        if (!$('rekap-bulan').value) $('rekap-bulan').value = thisMonth();
        const bulan = $('rekap-bulan').value;
        const items = load(KEY.pengeluaran, []).filter((p) => String(p.tanggal).indexOf(bulan) === 0);
        const total = items.reduce((s, p) => s + Number(p.nominal || 0), 0);
        $('rekap-out').innerHTML = `
            <div class="card mb-4"><p class="text-xs font-semibold text-slate-500 uppercase">Total pengeluaran</p>
                <p class="text-2xl font-bold text-slate-900 mt-1">${rp(total)}</p>
                <p class="text-sm text-slate-500">${items.length} entri</p></div>
            ${tableCard('Per kategori', groupSum(items, 'kategori'))}
            ${tableCard('Per mobil', groupSum(items, 'mobil'), 'mobil')}
            ${tableCard('Per sopir', groupSum(items, 'sopir'), 'sopir')}`;
        $('rekap-detail').innerHTML = '';
    }

    function showRekapDetail(tipe, nama) {
        const bulan = $('rekap-bulan').value || thisMonth();
        const items = load(KEY.pengeluaran, [])
            .filter((p) => String(p.tanggal).indexOf(bulan) === 0 && p[tipe] === nama)
            .sort((a, c) => String(a.tanggal).localeCompare(String(c.tanggal)));
        const total = items.reduce((s, p) => s + Number(p.nominal || 0), 0);
        const other = tipe === 'mobil' ? 'Sopir' : 'Mobil';
        const otherKey = tipe === 'mobil' ? 'sopir' : 'mobil';
        const kategori = [...new Set([...KATEGORI, ...items.map((p) => p.kategori)])]
            .filter((k) => items.some((p) => p.kategori === k));
        const blok = kategori.map((k) => {
            const rows = items.filter((p) => p.kategori === k);
            const sub = rows.reduce((s, p) => s + Number(p.nominal || 0), 0);
            return `
                <div class="mb-4">
                    <div class="flex justify-between font-semibold text-slate-800 border-b border-slate-200 pb-1">
                        <span>${esc(k)}</span><span>${rp(sub)}</span>
                    </div>
                    <table class="w-full text-sm">
                        ${rows.map((p) => `<tr class="border-t border-slate-100">
                            <td class="py-1.5 w-28 text-slate-500">${fmtTgl(p.tanggal)}</td>
                            <td class="py-1.5">${esc(p.keterangan || '-')}<span class="text-xs text-slate-400"> · ${esc(p[otherKey])}</span></td>
                            <td class="py-1.5 text-right">${rp(p.nominal)}</td>
                        </tr>`).join('')}
                    </table>
                </div>`;
        }).join('');
        $('rekap-detail').innerHTML = `
            <div class="card">
                <div class="flex items-center justify-between mb-1">
                    <p class="sec-title mb-0">Detail ${tipe === 'mobil' ? 'Mobil' : 'Sopir'}: ${esc(nama)}</p>
                    <button data-detail-close="1" class="text-xs text-slate-500 hover:underline">Tutup</button>
                </div>
                <p class="text-sm text-slate-500 mb-4">${other} terkait disertakan di setiap baris. Total ${rp(total)} · ${items.length} entri</p>
                ${blok || '<p class="text-slate-400 text-sm">Tidak ada pengeluaran di bulan ini.</p>'}
            </div>`;
        $('rekap-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /* ---------- Armada ---------- */
    function renderArmada() {
        const m = getMaster();
        $('armada-form').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Tambah Armada</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Plat Nomor</span><input id="a-plat" class="field" placeholder="Contoh: AB 1234 CD"></div>
                    <div><span class="label">Tipe</span><input id="a-tipe" class="field" placeholder="Bus / Hiace / Elf"></div>
                    <div><span class="label">Jumlah Seat</span><input id="a-seat" type="number" min="0" class="field"></div>
                    <div><span class="label">Status</span><select id="a-status" class="field">${optsStatus(ARMADA_STATUS, 'Siap')}</select></div>
                    <div><span class="label">STNK berlaku sampai</span><input type="date" id="a-stnk" class="field"></div>
                    <div><span class="label">KIR berlaku sampai</span><input type="date" id="a-kir" class="field"></div>
                </div>
                <button onclick="portalSaveArmada()" class="btn btn-primary">Simpan Armada</button>
            </div>`;
        $('armada-list').innerHTML = m.mobil.length
            ? '<div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">' + m.mobil.map((x, i) => `
                <div class="p-4 space-y-2">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="font-semibold text-slate-900">${esc(x.plat)}</p>
                            <p class="text-sm text-slate-500">${esc(x.tipe || '-')} · ${esc(x.seat || '-')} seat</p>
                        </div>
                        <button data-adel="${i}" class="text-xs text-rose-600 hover:underline shrink-0">Hapus</button>
                    </div>
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                        <select data-astatus="${i}" class="field !w-auto !py-1">${optsStatus(ARMADA_STATUS, x.status)}</select>
                        <span>STNK: ${expBadge(x.stnkExp)}</span>
                        <span>KIR: ${expBadge(x.kirExp)}</span>
                    </div>
                </div>`).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada armada.</div>';
    }
    window.portalSaveArmada = function () {
        const plat = $('a-plat').value.trim().toUpperCase();
        if (!plat) return toast('Plat nomor wajib diisi', 'err');
        const m = getMaster();
        if (m.mobil.some((x) => x.plat.toUpperCase() === plat)) return toast('Plat ini sudah terdaftar', 'err');
        m.mobil.push({
            plat, tipe: $('a-tipe').value.trim(), seat: $('a-seat').value,
            status: $('a-status').value, stnkExp: $('a-stnk').value, kirExp: $('a-kir').value
        });
        saveMaster(m);
        toast('Armada ditambahkan');
        renderArmada();
    };

    /* ---------- Supir (admin & owner) ---------- */
    function renderSupir() {
        const m = getMaster();
        const akun = getAkun();
        $('supir-form').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Tambah Supir</p>
                <p class="text-xs text-slate-500">Nama dipakai sebagai username login sopir.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Nama (username)</span><input id="s-nama" class="field"></div>
                    <div><span class="label">No. HP</span><input id="s-hp" class="field" inputmode="tel"></div>
                    <div><span class="label">Jenis SIM</span><input id="s-sim" class="field" placeholder="Contoh: B1 Umum"></div>
                    <div><span class="label">SIM berlaku sampai</span><input type="date" id="s-simexp" class="field"></div>
                    <div><span class="label">PIN awal (min 4 angka)</span><input id="s-pin" type="password" inputmode="numeric" class="field"></div>
                </div>
                <button onclick="portalSaveSupir()" class="btn btn-primary">Simpan Supir</button>
            </div>`;
        $('supir-list').innerHTML = m.sopir.length
            ? '<div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">' + m.sopir.map((s, i) => {
                const acc = akun.find((x) => x.role === 'sopir' && x.nama === s.nama);
                return `
                <div class="p-4 space-y-2">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="font-semibold text-slate-900">${esc(s.nama)}</p>
                            <p class="text-sm text-slate-500">${esc(s.hp || '-')} · SIM ${esc(s.sim || '-')}</p>
                        </div>
                        <div class="flex gap-3 shrink-0">
                            <button data-spin="${i}" class="text-xs text-blue-700 hover:underline">Reset PIN</button>
                            <button data-sdel="${i}" class="text-xs text-rose-600 hover:underline">Hapus</button>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-3 text-sm">
                        <select data-sstatus="${i}" class="field !w-auto !py-1">${optsStatus(SOPIR_STATUS, acc && acc.aktif === false ? 'Nonaktif' : 'Aktif')}</select>
                        <span>SIM: ${expBadge(s.simExp)}</span>
                    </div>
                </div>`;
            }).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada supir.</div>';
    }
    window.portalSaveSupir = function () {
        const nama = $('s-nama').value.trim();
        const pin = $('s-pin').value.trim();
        if (!nama) return toast('Nama wajib diisi', 'err');
        if (!validPin(pin)) return toast('PIN minimal 4 angka', 'err');
        const username = nama.toLowerCase();
        const akun = getAkun();
        if (akun.some((x) => x.username === username)) return toast('Username/nama sudah dipakai', 'err');
        const m = getMaster();
        if (m.sopir.some((s) => s.nama.toLowerCase() === username)) return toast('Nama supir sudah ada', 'err');
        m.sopir.push({ nama, hp: $('s-hp').value.trim(), sim: $('s-sim').value.trim(), simExp: $('s-simexp').value, status: 'Aktif' });
        saveMaster(m);
        akun.push({ id: uid(), username, nama, role: 'sopir', pin, aktif: true });
        saveAkun(akun);
        toast('Supir ditambahkan. Login pakai nama sebagai username.');
        renderSupir();
    };

    /* ---------- Keuangan ---------- */
    function renderKeuangan() {
        if (!$('keu-bulan').value) $('keu-bulan').value = thisMonth();
        const bulan = $('keu-bulan').value;
        const inv = load(KEY.history, []).filter((h) => String(h.date).indexOf(bulan) === 0);
        const peng = load(KEY.pengeluaran, []).filter((p) => String(p.tanggal).indexOf(bulan) === 0);
        let omzet = 0, masuk = 0, piutang = 0;
        inv.forEach((h) => { const t = totals(h); omzet += t.grand; masuk += t.dp; piutang += t.balance; });
        const keluar = peng.reduce((s, p) => s + Number(p.nominal || 0), 0);
        const laba = omzet - keluar;
        const cards = [
            ['Omzet invoice', rp(omzet), 'text-slate-900'],
            ['Uang masuk', rp(masuk), 'text-emerald-700'],
            ['Piutang', rp(piutang), 'text-rose-600'],
            ['Pengeluaran', rp(keluar), 'text-slate-900'],
            ['Perkiraan laba kotor', rp(laba), laba >= 0 ? 'text-emerald-700' : 'text-rose-600']
        ].map(([t, v, c]) => `<div class="card-stat"><p class="text-xs font-semibold text-slate-500 uppercase">${t}</p><p class="text-xl font-bold ${c} mt-1">${v}</p></div>`).join('');
        const rows = inv.length
            ? inv.map((h) => `<tr class="border-t border-slate-100"><td class="py-2 font-mono text-xs">${esc(h.number)}</td><td class="py-2">${esc((h.customer && h.customer.name) || '-')}</td><td class="py-2 text-right">${rp(totals(h).grand)}</td></tr>`).join('')
            : '<tr><td colspan="3" class="py-4 text-center text-slate-400">Belum ada invoice bulan ini</td></tr>';
        $('keuangan-out').innerHTML = `
            <div class="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-4">${cards}</div>
            <p class="text-xs text-slate-500 mb-4">Laba kotor = omzet invoice dikurangi pengeluaran perjalanan. Belum termasuk gaji, servis, dan perpanjangan STNK/KIR.</p>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div class="card"><p class="sec-title">Invoice bulan ini</p><table class="w-full text-sm"><tbody>${rows}</tbody></table></div>
                ${tableCard('Pengeluaran per kategori', groupSum(peng, 'kategori'))}
            </div>`;
    }

    /* ---------- PIN saya ---------- */
    function renderPin() {
        $('pin-body').innerHTML = `
            <div class="card space-y-3">
                <p class="sec-title">Ganti PIN Saya</p>
                <div><span class="label">PIN lama</span><input id="pin-lama" type="password" inputmode="numeric" class="field"></div>
                <div><span class="label">PIN baru (min 4 angka)</span><input id="pin-baru" type="password" inputmode="numeric" class="field"></div>
                <div><span class="label">Ulangi PIN baru</span><input id="pin-ulang" type="password" inputmode="numeric" class="field"></div>
                <button onclick="portalChangeOwnPin()" class="btn btn-primary">Simpan PIN</button>
            </div>`;
    }
    window.portalChangeOwnPin = function () {
        const lama = $('pin-lama').value.trim();
        const baru = $('pin-baru').value.trim();
        const ulang = $('pin-ulang').value.trim();
        if (!validPin(baru)) return toast('PIN baru minimal 4 angka', 'err');
        if (baru !== ulang) return toast('Ulangi PIN baru tidak sama', 'err');
        const akun = getAkun();
        const a = akun.find((x) => x.id === session.id);
        if (!a || String(a.pin) !== lama) return toast('PIN lama salah', 'err');
        a.pin = baru;
        saveAkun(akun);
        toast('PIN berhasil diubah');
        renderPin();
    };

    /* ---------- Akun & reset (owner / dev) ---------- */
    function renderAkun() {
        const akun = getAkun();
        const isSuper = session.role === 'owner' || session.role === 'dev';
        const rows = akun.map((a) => {
            const protectedAcc = a.role === 'owner' || a.role === 'dev';
            return `
            <div class="p-4 flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <p class="font-semibold text-slate-900">${esc(a.nama)} <span class="text-xs text-slate-400">(${esc(a.username)})</span></p>
                    <p class="text-sm text-slate-500">${ROLE_LABEL[a.role]}${a.aktif === false ? ' · <span class="text-rose-600">nonaktif</span>' : ''}</p>
                </div>
                <div class="flex gap-3 shrink-0 text-xs">
                    <button data-apin="${esc(a.id)}" class="text-blue-700 hover:underline">Reset PIN</button>
                    ${protectedAcc ? '' : `<button data-atoggle="${esc(a.id)}" class="text-slate-600 hover:underline">${a.aktif === false ? 'Aktifkan' : 'Nonaktifkan'}</button>`}
                    ${protectedAcc ? '' : `<button data-adel-akun="${esc(a.id)}" class="text-rose-600 hover:underline">Hapus</button>`}
                </div>
            </div>`;
        }).join('');
        $('akun-body').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Tambah Akun</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Nama</span><input id="ak-nama" class="field"></div>
                    <div><span class="label">Username</span><input id="ak-user" class="field" placeholder="Huruf kecil, tanpa spasi"></div>
                    <div><span class="label">PIN awal (min 4 angka)</span><input id="ak-pin" type="password" inputmode="numeric" class="field"></div>
                    <div><span class="label">Peran</span><select id="ak-role" class="field"><option value="mandor">Mandor</option><option value="admin">Admin</option><option value="sopir">Sopir</option></select></div>
                </div>
                <p class="text-xs text-slate-500">Untuk peran Sopir, akun juga dibuat di daftar Supir. Gunakan menu Supir untuk data lengkapnya.</p>
                <button onclick="portalAddAkun()" class="btn btn-primary">Tambah Akun</button>
            </div>
            <div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 mb-4">${rows}</div>
            ${isSuper ? `
            <div class="card border-rose-200">
                <p class="sec-title text-rose-700">Reset Web</p>
                <p class="text-sm text-slate-600 mb-3">Menghapus semua data (invoice, booking, pengeluaran, armada, supir, akun) dari browser ini dan mengembalikan PIN default. Tidak bisa dibatalkan.</p>
                <input id="reset-konfirm" class="field mb-3" placeholder="Ketik RESET untuk melanjutkan">
                <button onclick="portalResetWeb()" class="btn bg-rose-600 text-white border-rose-600 w-full">Reset Web</button>
            </div>` : ''}`;
    }
    window.portalAddAkun = function () {
        const nama = $('ak-nama').value.trim();
        const username = $('ak-user').value.trim().toLowerCase().replace(/\s+/g, '');
        const pin = $('ak-pin').value.trim();
        const role = $('ak-role').value;
        if (!nama || !username) return toast('Nama dan username wajib diisi', 'err');
        if (!validPin(pin)) return toast('PIN minimal 4 angka', 'err');
        const akun = getAkun();
        if (akun.some((x) => x.username === username)) return toast('Username sudah dipakai', 'err');
        akun.push({ id: uid(), username, nama, role, pin, aktif: true });
        saveAkun(akun);
        if (role === 'sopir') {
            const m = getMaster();
            if (!m.sopir.some((s) => s.nama === nama)) {
                m.sopir.push({ nama, hp: '', sim: '', simExp: '', status: 'Aktif' });
                saveMaster(m);
            }
        }
        toast('Akun ditambahkan');
        renderAkun();
    };
    window.portalResetWeb = function () {
        if ($('reset-konfirm').value.trim() !== 'RESET') return toast('Ketik RESET dulu untuk konfirmasi', 'err');
        Object.keys(localStorage).filter((k) => k.indexOf('tw_') === 0).forEach((k) => localStorage.removeItem(k));
        sessionStorage.removeItem(KEY.session);
        location.reload();
    };

    /* ---------- Aksi tabel (delegasi) ---------- */
    document.addEventListener('click', (e) => {
        const t = (sel) => e.target.closest(sel);
        let el;
        if ((el = t('[data-dtipe]'))) return showRekapDetail(el.dataset.dtipe, el.dataset.dnama);
        if (t('[data-detail-close]')) { $('rekap-detail').innerHTML = ''; return; }
        if ((el = t('[data-toggle-detail]'))) {
            const id = el.dataset.toggleDetail;
            if (openBooking.has(id)) openBooking.delete(id); else openBooking.add(id);
            return renderJadwal();
        }
        if ((el = t('[data-bdel]'))) { if (!confirm('Hapus booking ini?')) return; saveBooking(getBooking().filter((x) => x.id !== el.dataset.bdel)); return renderJadwal(); }
        if ((el = t('[data-assign]'))) return handleAssign(el.dataset.assign);
        if ((el = t('[data-cek-save]'))) return handleCekSave(el.dataset.cekSave, el.dataset.cekFase);
        if ((el = t('[data-pdel]'))) { if (!confirm('Hapus pengeluaran ini?')) return; save(KEY.pengeluaran, load(KEY.pengeluaran, []).filter((x) => x.id !== el.dataset.pdel)); return renderPengeluaran(); }
        if ((el = t('[data-adel]'))) { if (!confirm('Hapus armada ini?')) return; const m = getMaster(); m.mobil.splice(Number(el.dataset.adel), 1); saveMaster(m); return renderArmada(); }
        if ((el = t('[data-sdel]'))) {
            if (!confirm('Hapus supir ini? Akun loginnya juga dihapus.')) return;
            const m = getMaster(); const s = m.sopir[Number(el.dataset.sdel)];
            m.sopir.splice(Number(el.dataset.sdel), 1); saveMaster(m);
            if (s) saveAkun(getAkun().filter((a) => !(a.role === 'sopir' && a.nama === s.nama)));
            return renderSupir();
        }
        if ((el = t('[data-spin]'))) {
            const m = getMaster(); const s = m.sopir[Number(el.dataset.spin)];
            const baru = prompt('PIN baru untuk ' + s.nama + ' (min 4 angka):');
            if (baru === null) return;
            if (!validPin(baru.trim())) return toast('PIN minimal 4 angka', 'err');
            const akun = getAkun(); const a = akun.find((x) => x.role === 'sopir' && x.nama === s.nama);
            if (a) { a.pin = baru.trim(); saveAkun(akun); }
            return toast('PIN ' + s.nama + ' direset');
        }
        if ((el = t('[data-apin]'))) {
            const akun = getAkun(); const a = akun.find((x) => x.id === el.dataset.apin);
            if (!a) return;
            const baru = prompt('PIN baru untuk ' + a.nama + ' (min 4 angka):');
            if (baru === null) return;
            if (!validPin(baru.trim())) return toast('PIN minimal 4 angka', 'err');
            a.pin = baru.trim(); saveAkun(akun);
            return toast('PIN ' + a.nama + ' direset');
        }
        if ((el = t('[data-atoggle]'))) {
            const akun = getAkun(); const a = akun.find((x) => x.id === el.dataset.atoggle);
            if (a) { a.aktif = a.aktif === false; saveAkun(akun); }
            return renderAkun();
        }
        if ((el = t('[data-adel-akun]'))) {
            if (!confirm('Hapus akun ini?')) return;
            saveAkun(getAkun().filter((x) => x.id !== el.dataset.adelAkun));
            return renderAkun();
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'jadwal-cari') renderBookingAdmin();
    });

    document.addEventListener('change', (e) => {
        const tj = e.target.closest('[data-tuj-id]');
        if (tj) return handleTujuan(tj.dataset.tujId, Number(tj.dataset.tujIdx), tj.checked);
        const as = e.target.closest('[data-astatus]');
        if (as) { const m = getMaster(); m.mobil[Number(as.dataset.astatus)].status = as.value; saveMaster(m); return; }
        const ss = e.target.closest('[data-sstatus]');
        if (ss) {
            const m = getMaster(); const s = m.sopir[Number(ss.dataset.sstatus)];
            const akun = getAkun(); const a = akun.find((x) => x.role === 'sopir' && x.nama === s.nama);
            if (a) { a.aktif = ss.value === 'Aktif'; saveAkun(akun); }
        }
    });

    /* ---------- Invoice -> booking otomatis ---------- */
    function syncBookingFromInvoice() {
        let inv;
        try { inv = JSON.parse(localStorage.getItem('tw_active')); } catch (e) { return; }
        if (!inv || !inv.number) return;
        if (!load(KEY.history, []).some((h) => h.number === inv.number)) return;

        const cust = inv.customer || {};
        const tujuan = (inv.items || []).map((i) => String(i.desc || '').trim()).filter(Boolean);
        const list = getBooking();
        const b = list.find((x) => x.invoice === inv.number);

        if (b) {
            b.customer = cust.name || b.customer;
            b.hp = cust.phone || b.hp;
            b.tanggal = inv.date || b.tanggal;
            const started = !!b.mobil || b.progres.some((p) => p.done);
            if (!started && tujuan.length) {
                b.tujuan = tujuan;
                b.progres = tujuan.map(() => ({ done: false, jam: '' }));
            }
            saveBooking(list);
            return toast('Booking ' + inv.number + ' diperbarui dari invoice');
        }

        if (!tujuan.length) return toast('Invoice belum punya deskripsi tujuan, booking tidak dibuat', 'err');
        list.push({
            id: uid(), tanggal: inv.date || today(), customer: cust.name || '-', hp: cust.phone || '',
            invoice: inv.number, tujuan, mobil: '', sopir: '',
            progres: tujuan.map(() => ({ done: false, jam: '' })),
            cek: { pre: {}, post: {} }, dibuat: new Date().toISOString()
        });
        saveBooking(list);
        toast('Booking dibuat otomatis dari invoice');
        if (typeof window.__refreshBooking === 'function') window.__refreshBooking();
    }

    /* ---------- Hook dari showView di index.html ---------- */
    window.__onView = function (name) {
        if (!session) return;
        const map = {
            jadwal: renderJadwal, pengeluaran: renderPengeluaran, rekap: renderRekap,
            armada: renderArmada, supir: renderSupir, keuangan: renderKeuangan,
            arsip: renderArsip, pin: renderPin, akun: renderAkun
        };
        if (map[name]) map[name]();
    };

    function init() {
        getAkun();
        const origSave = window.saveInvoiceToHistory;
        if (typeof origSave === 'function') {
            window.saveInvoiceToHistory = function () { origSave(); syncBookingFromInvoice(); };
        }
        $('rekap-bulan').addEventListener('change', renderRekap);
        $('keu-bulan').addEventListener('change', renderKeuangan);
        $('arsip-cari').addEventListener('input', renderArsip);
        if (session && VIEWS[session.role]) startApp();
    }
    init();
})();
