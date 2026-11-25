/* ==========================================================
   Portal peran: login PIN + Jadwal, Pengeluaran, Rekap, Master
   Semua data lokal (localStorage). Dipakai bersama index.html
   ========================================================== */
(function () {
    'use strict';

    const PIN = { sopir: '1111', mandor: '2222', admin: '3333' }; // GANTI sebelum dipakai
    const KATEGORI = ['BBM', 'Parkir', 'Uang Makan', 'Tiket', 'Lain-lain'];
    const KEY = { master: 'tw_master', jadwal: 'tw_jadwal', pengeluaran: 'tw_pengeluaran', session: 'tw_session' };
    const VIEWS = {
        sopir: ['pengeluaran', 'jadwal'],
        mandor: ['jadwal'],
        admin: ['dashboard', 'invoices', 'generator', 'jadwal', 'pengeluaran', 'rekap', 'master']
    };

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
    const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
    const fmtTgl = (s) => { const d = new Date(s + 'T00:00:00'); return isNaN(d) ? esc(s) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); };
    const uid = () => Math.random().toString(36).slice(2, 10);
    const opts = (list, sel) => (list || []).map((x) => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('');

    function load(k, fb) {
        try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; }
        catch (e) { return fb; }
    }
    function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    function getMaster() { return load(KEY.master, { sopir: [], mobil: [] }); }
    function toast(msg) {
        const box = $('toast-container');
        if (!box) return;
        const t = document.createElement('div');
        t.className = 'bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg transition-opacity duration-300';
        t.textContent = msg;
        box.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2600);
    }

    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(KEY.session)); } catch (e) { session = null; }

    /* ---------- Login ---------- */
    function fillLoginNames() {
        const role = $('login-role').value;
        $('login-nama-wrap').classList.toggle('hidden', role !== 'sopir');
        $('login-nama').innerHTML = opts(getMaster().sopir);
    }

    window.portalLogin = function () {
        const role = $('login-role').value;
        const pin = $('login-pin').value;
        if (String(PIN[role]) !== pin) { $('login-msg').textContent = 'PIN salah'; return; }
        let nama = '';
        if (role === 'sopir') {
            nama = $('login-nama').value;
            if (!nama) { $('login-msg').textContent = 'Belum ada sopir. Admin harus tambah di menu Master dulu.'; return; }
        }
        session = { role, nama };
        sessionStorage.setItem(KEY.session, JSON.stringify(session));
        $('login-pin').value = '';
        $('login-msg').textContent = '';
        startApp();
    };

    window.portalLogout = function () {
        session = null;
        sessionStorage.removeItem(KEY.session);
        document.body.classList.remove('role-sopir', 'role-mandor', 'role-admin');
        $('login-screen').classList.remove('hidden');
        fillLoginNames();
    };

    function startApp() {
        $('login-screen').classList.add('hidden');
        document.body.classList.remove('role-sopir', 'role-mandor', 'role-admin');
        document.body.classList.add('role-' + session.role);
        $('sidebar-company').textContent = session.role === 'sopir'
            ? 'Sopir: ' + session.nama
            : 'Login: ' + session.role;
        showView(VIEWS[session.role][0]);
    }

    /* ---------- Jadwal ---------- */
    function renderJadwal() {
        const role = session.role;
        const m = getMaster();
        let list = load(KEY.jadwal, []);
        if (role === 'sopir') list = list.filter((j) => j.sopir === session.nama);
        list = list.slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));

        $('jadwal-form').innerHTML = role === 'sopir' ? '' : `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Tambah Jadwal</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Tanggal</span><input type="date" id="j-tgl" class="field" value="${today()}"></div>
                    <div><span class="label">Mobil</span><select id="j-mobil" class="field">${opts(m.mobil)}</select></div>
                    <div><span class="label">Sopir</span><select id="j-sopir" class="field">${opts(m.sopir)}</select></div>
                    <div><span class="label">Rute</span><input id="j-rute" class="field" placeholder="Contoh: Jogja - Bromo"></div>
                </div>
                <button onclick="portalSaveJadwal()" class="btn btn-primary">Simpan Jadwal</button>
            </div>`;

        $('jadwal-list').innerHTML = list.length
            ? '<div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">' + list.map((j) => `
                <div class="p-4 flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-slate-900">${fmtTgl(j.tanggal)} · ${esc(j.mobil)}</p>
                        <p class="text-sm text-slate-500">Sopir: ${esc(j.sopir)}${j.rute ? ' · ' + esc(j.rute) : ''}</p>
                    </div>
                    ${role !== 'sopir' ? `<button data-jdel="${esc(j.id)}" class="text-xs text-rose-600 hover:underline shrink-0">Hapus</button>` : ''}
                </div>`).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada jadwal.</div>';
    }

    window.portalSaveJadwal = function () {
        const d = {
            id: uid(),
            tanggal: $('j-tgl').value,
            mobil: $('j-mobil').value,
            sopir: $('j-sopir').value,
            rute: $('j-rute').value.trim(),
            status: 'Terjadwal'
        };
        if (!d.tanggal || !d.mobil || !d.sopir) return toast('Tanggal, mobil, dan sopir wajib diisi');
        const list = load(KEY.jadwal, []);
        list.push(d);
        save(KEY.jadwal, list);
        toast('Jadwal tersimpan');
        renderJadwal();
    };

    /* ---------- Pengeluaran ---------- */
    function renderPengeluaran() {
        const role = session.role;
        const m = getMaster();
        let list = load(KEY.pengeluaran, []);
        if (role === 'sopir') list = list.filter((p) => p.sopir === session.nama);
        list = list.slice().sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal))).slice(0, 200);

        const sopirField = role === 'admin'
            ? `<div><span class="label">Sopir</span><select id="p-sopir" class="field">${opts(m.sopir)}</select></div>`
            : `<div><span class="label">Sopir</span><input class="field" value="${esc(session.nama)}" disabled></div>`;

        $('pengeluaran-form').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Input Pengeluaran</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Tanggal</span><input type="date" id="p-tgl" class="field" value="${today()}"></div>
                    ${sopirField}
                    <div><span class="label">Mobil</span><select id="p-mobil" class="field">${opts(m.mobil)}</select></div>
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
                        ${role === 'admin' ? `<button data-pdel="${esc(p.id)}" class="text-xs text-rose-600 hover:underline">Hapus</button>` : ''}
                    </div>
                </div>`).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada pengeluaran.</div>';
    }

    window.portalSaveExpense = function () {
        const d = {
            id: uid(),
            tanggal: $('p-tgl').value,
            sopir: session.role === 'sopir' ? session.nama : $('p-sopir').value,
            mobil: $('p-mobil').value,
            kategori: $('p-kat').value,
            keterangan: $('p-ket').value.trim(),
            nominal: Number($('p-nom').value) || 0
        };
        if (!d.tanggal || !d.sopir || !d.mobil) return toast('Tanggal, sopir, dan mobil wajib diisi');
        if (d.nominal <= 0) return toast('Nominal harus lebih dari 0');
        const list = load(KEY.pengeluaran, []);
        list.push(d);
        save(KEY.pengeluaran, list);
        toast('Pengeluaran tersimpan');
        renderPengeluaran();
    };

    /* ---------- Rekap (admin) ---------- */
    function groupSum(items, key) {
        const acc = {};
        items.forEach((p) => { acc[p[key]] = (acc[p[key]] || 0) + Number(p.nominal || 0); });
        return Object.keys(acc).map((k) => ({ nama: k, total: acc[k] })).sort((a, b) => b.total - a.total);
    }
    function tableCard(title, rows) {
        const body = rows.length
            ? rows.map((r) => `<tr class="border-t border-slate-100"><td class="py-2">${esc(r.nama)}</td><td class="py-2 text-right font-semibold">${rp(r.total)}</td></tr>`).join('')
            : '<tr><td class="py-4 text-center text-slate-400">Tidak ada data</td></tr>';
        return `<div class="card"><p class="sec-title">${title}</p><table class="w-full text-sm">${body}</table></div>`;
    }

    function renderRekap() {
        if (!$('rekap-bulan').value) $('rekap-bulan').value = today().slice(0, 7);
        const bulan = $('rekap-bulan').value;
        const items = load(KEY.pengeluaran, []).filter((p) => String(p.tanggal).indexOf(bulan) === 0);
        const total = items.reduce((s, p) => s + Number(p.nominal || 0), 0);
        $('rekap-out').innerHTML = `
            <div class="card mb-4"><p class="text-xs font-semibold text-slate-500 uppercase">Total pengeluaran</p>
                <p class="text-2xl font-bold text-slate-900 mt-1">${rp(total)}</p>
                <p class="text-sm text-slate-500">${items.length} entri</p></div>
            ${tableCard('Per kategori', groupSum(items, 'kategori'))}
            ${tableCard('Per mobil', groupSum(items, 'mobil'))}
            ${tableCard('Per sopir', groupSum(items, 'sopir'))}`;
    }

    /* ---------- Master (admin) ---------- */
    function renderMaster() {
        const m = getMaster();
        const list = (tipe, label) => `
            <div class="card"><p class="sec-title">${label}</p>
                ${m[tipe].length ? m[tipe].map((x, i) => `
                    <div class="flex items-center justify-between py-2 border-t border-slate-100">
                        <span>${esc(x)}</span>
                        <button data-mtipe="${tipe}" data-midx="${i}" class="text-xs text-rose-600 hover:underline">Hapus</button>
                    </div>`).join('') : '<p class="text-sm text-slate-400">Belum ada data.</p>'}
            </div>`;
        $('master-body').innerHTML = `
            <div class="card"><p class="sec-title">Tambah Sopir</p>
                <div class="flex gap-2"><input id="m-sopir" class="field" placeholder="Nama sopir">
                <button onclick="portalAddMaster('sopir')" class="btn btn-primary whitespace-nowrap">Tambah</button></div></div>
            <div class="card"><p class="sec-title">Tambah Mobil</p>
                <div class="flex gap-2"><input id="m-mobil" class="field" placeholder="Nama / plat mobil">
                <button onclick="portalAddMaster('mobil')" class="btn btn-primary whitespace-nowrap">Tambah</button></div></div>
            ${list('sopir', 'Daftar Sopir')}
            ${list('mobil', 'Daftar Mobil')}`;
    }

    window.portalAddMaster = function (tipe) {
        const input = tipe === 'sopir' ? $('m-sopir') : $('m-mobil');
        const nama = input.value.trim();
        if (!nama) return toast('Isi nama dulu');
        const m = getMaster();
        m[tipe].push(nama);
        save(KEY.master, m);
        toast('Ditambahkan');
        renderMaster();
    };

    /* ---------- Hapus (delegasi) ---------- */
    document.addEventListener('click', (e) => {
        const j = e.target.closest('[data-jdel]');
        if (j) {
            if (!confirm('Hapus jadwal ini?')) return;
            save(KEY.jadwal, load(KEY.jadwal, []).filter((x) => x.id !== j.dataset.jdel));
            return renderJadwal();
        }
        const p = e.target.closest('[data-pdel]');
        if (p) {
            if (!confirm('Hapus pengeluaran ini?')) return;
            save(KEY.pengeluaran, load(KEY.pengeluaran, []).filter((x) => x.id !== p.dataset.pdel));
            return renderPengeluaran();
        }
        const md = e.target.closest('[data-mtipe]');
        if (md) {
            const m = getMaster();
            m[md.dataset.mtipe].splice(Number(md.dataset.midx), 1);
            save(KEY.master, m);
            renderMaster();
        }
    });

    /* ---------- Hook dari showView di index.html ---------- */
    window.__onView = function (name) {
        if (!session) return;
        const map = { jadwal: renderJadwal, pengeluaran: renderPengeluaran, rekap: renderRekap, master: renderMaster };
        if (map[name]) map[name]();
    };

    function init() {
        $('login-role').addEventListener('change', fillLoginNames);
        $('rekap-bulan').addEventListener('change', renderRekap);
        fillLoginNames();
        if (session && VIEWS[session.role]) startApp();
    }
    init();
})();
