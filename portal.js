/* ==========================================================
   Portal peran: login PIN per orang, Jadwal, Pengeluaran,
   Armada, Supir, Keuangan, Rekap, dan ganti PIN.
   Data lokal (localStorage). Dipakai bersama index.html
   ========================================================== */
(function () {
    'use strict';

    const KATEGORI = ['BBM', 'Parkir', 'Uang Makan', 'Tiket', 'Lain-lain'];
    const ARMADA_STATUS = ['Siap', 'Dipakai', 'Servis'];
    const SOPIR_STATUS = ['Aktif', 'Cuti', 'Nonaktif'];
    const KEY = {
        master: 'tw_master', auth: 'tw_auth', jadwal: 'tw_jadwal',
        pengeluaran: 'tw_pengeluaran', history: 'tw_history', session: 'tw_session'
    };
    const VIEWS = {
        sopir: ['pengeluaran', 'jadwal', 'pin'],
        mandor: ['jadwal', 'pin'],
        admin: ['dashboard', 'invoices', 'generator', 'jadwal', 'pengeluaran', 'rekap', 'armada', 'supir', 'keuangan', 'pin']
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

    /* ---------- Data ---------- */
    function getMaster() {
        const raw = load(KEY.master, {});
        const sopir = (raw.sopir || []).map((s) => typeof s === 'string'
            ? { nama: s, pin: '1111', hp: '', sim: '', simExp: '', status: 'Aktif' }
            : { nama: '', pin: '1111', hp: '', sim: '', simExp: '', status: 'Aktif', ...s });
        const mobil = (raw.mobil || []).map((m) => typeof m === 'string'
            ? { plat: m, tipe: '', seat: '', status: 'Siap', stnkExp: '', kirExp: '' }
            : { plat: '', tipe: '', seat: '', status: 'Siap', stnkExp: '', kirExp: '', ...m });
        return { sopir, mobil };
    }
    function saveMaster(m) { save(KEY.master, m); }
    function getAuth() { return { mandor: '2222', admin: '3333', ...load(KEY.auth, {}) }; }
    function saveAuth(a) { save(KEY.auth, a); }
    function namaSopir(m) { return m.sopir.map((s) => s.nama); }
    function platMobil(m) { return m.mobil.map((x) => x.plat); }

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

    /* ---------- Login ---------- */
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem(KEY.session)); } catch (e) { session = null; }

    function fillLoginNames() {
        const role = $('login-role').value;
        $('login-nama-wrap').classList.toggle('hidden', role !== 'sopir');
        $('login-nama').innerHTML = opts(namaSopir(getMaster()));
    }

    window.portalLogin = function () {
        const role = $('login-role').value;
        const pin = $('login-pin').value.trim();
        const msg = (t) => { $('login-msg').textContent = t; };
        let nama = '';
        if (role === 'sopir') {
            nama = $('login-nama').value;
            const s = getMaster().sopir.find((x) => x.nama === nama);
            if (!s) return msg('Belum ada sopir. Admin tambah di menu Supir dulu.');
            if (s.status !== 'Aktif') return msg('Akun sopir ini tidak aktif.');
            if (String(s.pin) !== pin) return msg('PIN salah');
        } else if (String(getAuth()[role]) !== pin) {
            return msg('PIN salah');
        }
        session = { role, nama };
        sessionStorage.setItem(KEY.session, JSON.stringify(session));
        $('login-pin').value = '';
        msg('');
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
        const allowed = VIEWS[session.role];
        document.querySelectorAll('.nav-btn').forEach((b) => {
            b.style.display = allowed.indexOf(b.dataset.nav) === -1 ? 'none' : '';
        });
        $('sidebar-company').textContent = session.role === 'sopir' ? 'Sopir: ' + session.nama : 'Login: ' + session.role;
        showView(allowed[0]);
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
                    <div><span class="label">Mobil</span><select id="j-mobil" class="field">${opts(platMobil(m))}</select></div>
                    <div><span class="label">Sopir</span><select id="j-sopir" class="field">${opts(namaSopir(m))}</select></div>
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
            id: uid(), tanggal: $('j-tgl').value, mobil: $('j-mobil').value,
            sopir: $('j-sopir').value, rute: $('j-rute').value.trim(), status: 'Terjadwal'
        };
        if (!d.tanggal || !d.mobil || !d.sopir) return toast('Tanggal, mobil, dan sopir wajib diisi', 'err');
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
                        ${role === 'admin' ? `<button data-pdel="${esc(p.id)}" class="text-xs text-rose-600 hover:underline">Hapus</button>` : ''}
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
        if (!$('rekap-bulan').value) $('rekap-bulan').value = thisMonth();
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

    /* ---------- Armada (admin) ---------- */
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

    /* ---------- Supir (admin) ---------- */
    function renderSupir() {
        const m = getMaster();
        $('supir-form').innerHTML = `
            <div class="card mb-4 space-y-3">
                <p class="sec-title">Tambah Supir</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span class="label">Nama</span><input id="s-nama" class="field"></div>
                    <div><span class="label">No. HP</span><input id="s-hp" class="field" inputmode="tel"></div>
                    <div><span class="label">Jenis SIM</span><input id="s-sim" class="field" placeholder="Contoh: B1 Umum"></div>
                    <div><span class="label">SIM berlaku sampai</span><input type="date" id="s-simexp" class="field"></div>
                    <div><span class="label">PIN awal (min 4 angka)</span><input id="s-pin" type="password" inputmode="numeric" class="field" placeholder="Kosong = 1111"></div>
                    <div><span class="label">Status</span><select id="s-status" class="field">${optsStatus(SOPIR_STATUS, 'Aktif')}</select></div>
                </div>
                <button onclick="portalSaveSupir()" class="btn btn-primary">Simpan Supir</button>
            </div>`;
        $('supir-list').innerHTML = m.sopir.length
            ? '<div class="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">' + m.sopir.map((s, i) => `
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
                        <select data-sstatus="${i}" class="field !w-auto !py-1">${optsStatus(SOPIR_STATUS, s.status)}</select>
                        <span>SIM: ${expBadge(s.simExp)}</span>
                    </div>
                </div>`).join('') + '</div>'
            : '<div class="text-center text-slate-400 py-10">Belum ada supir.</div>';
    }

    window.portalSaveSupir = function () {
        const nama = $('s-nama').value.trim();
        const pin = $('s-pin').value.trim() || '1111';
        if (!nama) return toast('Nama wajib diisi', 'err');
        if (!validPin(pin)) return toast('PIN minimal 4 angka', 'err');
        const m = getMaster();
        if (m.sopir.some((s) => s.nama.toLowerCase() === nama.toLowerCase())) return toast('Nama supir sudah ada', 'err');
        m.sopir.push({
            nama, hp: $('s-hp').value.trim(), sim: $('s-sim').value.trim(),
            simExp: $('s-simexp').value, pin, status: $('s-status').value
        });
        saveMaster(m);
        toast('Supir ditambahkan');
        renderSupir();
    };

    /* ---------- Keuangan (admin) ---------- */
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
                <div class="card"><p class="sec-title">Invoice bulan ini</p>
                    <table class="w-full text-sm"><tbody>${rows}</tbody></table></div>
                ${tableCard('Pengeluaran per kategori', groupSum(peng, 'kategori'))}
            </div>`;
    }

    /* ---------- PIN ---------- */
    function renderPin() {
        const admin = session.role === 'admin';
        $('pin-body').innerHTML = `
            <div class="card space-y-3 mb-4">
                <p class="sec-title">Ganti PIN Saya</p>
                <div><span class="label">PIN lama</span><input id="pin-lama" type="password" inputmode="numeric" class="field"></div>
                <div><span class="label">PIN baru (min 4 angka)</span><input id="pin-baru" type="password" inputmode="numeric" class="field"></div>
                <div><span class="label">Ulangi PIN baru</span><input id="pin-ulang" type="password" inputmode="numeric" class="field"></div>
                <button onclick="portalChangeOwnPin()" class="btn btn-primary">Simpan PIN</button>
            </div>
            ${admin ? `
            <div class="card space-y-3">
                <p class="sec-title">Atur PIN Mandor</p>
                <div><span class="label">PIN baru mandor</span><input id="pin-mandor" type="password" inputmode="numeric" class="field"></div>
                <button onclick="portalSetMandorPin()" class="btn btn-primary">Simpan PIN Mandor</button>
            </div>` : ''}`;
    }

    window.portalChangeOwnPin = function () {
        const lama = $('pin-lama').value.trim();
        const baru = $('pin-baru').value.trim();
        const ulang = $('pin-ulang').value.trim();
        if (!validPin(baru)) return toast('PIN baru minimal 4 angka', 'err');
        if (baru !== ulang) return toast('Ulangi PIN baru tidak sama', 'err');
        if (session.role === 'sopir') {
            const m = getMaster();
            const s = m.sopir.find((x) => x.nama === session.nama);
            if (!s || String(s.pin) !== lama) return toast('PIN lama salah', 'err');
            s.pin = baru;
            saveMaster(m);
        } else {
            const a = getAuth();
            if (String(a[session.role]) !== lama) return toast('PIN lama salah', 'err');
            a[session.role] = baru;
            saveAuth(a);
        }
        toast('PIN berhasil diubah');
        renderPin();
    };

    window.portalSetMandorPin = function () {
        const p = $('pin-mandor').value.trim();
        if (!validPin(p)) return toast('PIN minimal 4 angka', 'err');
        const a = getAuth();
        a.mandor = p;
        saveAuth(a);
        toast('PIN mandor diubah');
        $('pin-mandor').value = '';
    };

    /* ---------- Aksi tabel (delegasi) ---------- */
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
        const ad = e.target.closest('[data-adel]');
        if (ad) {
            if (!confirm('Hapus armada ini?')) return;
            const m = getMaster(); m.mobil.splice(Number(ad.dataset.adel), 1); saveMaster(m);
            return renderArmada();
        }
        const sd = e.target.closest('[data-sdel]');
        if (sd) {
            if (!confirm('Hapus supir ini?')) return;
            const m = getMaster(); m.sopir.splice(Number(sd.dataset.sdel), 1); saveMaster(m);
            return renderSupir();
        }
        const sp = e.target.closest('[data-spin]');
        if (sp) {
            const m = getMaster();
            const s = m.sopir[Number(sp.dataset.spin)];
            const baru = prompt('PIN baru untuk ' + s.nama + ' (min 4 angka):');
            if (baru === null) return;
            if (!validPin(baru.trim())) return toast('PIN minimal 4 angka', 'err');
            s.pin = baru.trim(); saveMaster(m);
            return toast('PIN ' + s.nama + ' direset');
        }
    });

    document.addEventListener('change', (e) => {
        const as = e.target.closest('[data-astatus]');
        if (as) { const m = getMaster(); m.mobil[Number(as.dataset.astatus)].status = as.value; saveMaster(m); return; }
        const ss = e.target.closest('[data-sstatus]');
        if (ss) { const m = getMaster(); m.sopir[Number(ss.dataset.sstatus)].status = ss.value; saveMaster(m); }
    });

    /* ---------- Hook dari showView di index.html ---------- */
    window.__onView = function (name) {
        if (!session) return;
        const map = {
            jadwal: renderJadwal, pengeluaran: renderPengeluaran, rekap: renderRekap,
            armada: renderArmada, supir: renderSupir, keuangan: renderKeuangan, pin: renderPin
        };
        if (map[name]) map[name]();
    };

    function init() {
        $('login-role').addEventListener('change', fillLoginNames);
        $('rekap-bulan').addEventListener('change', renderRekap);
        $('keu-bulan').addEventListener('change', renderKeuangan);
        fillLoginNames();
        if (session && VIEWS[session.role]) startApp();
    }
    init();
})();
