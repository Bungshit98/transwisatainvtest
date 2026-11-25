/* ==========================================================
   Generator Invoice Transwisata - app.js
   ========================================================== */
(function () {
    'use strict';

    /* ---------- Konstanta ---------- */
    const KEY = { company: 'tw_company', history: 'tw_history', active: 'tw_active' };
    const TABS = ['transaksi', 'perusahaan', 'riwayat'];
    const STATUS_LABEL = { UNPAID: 'BELUM BAYAR', DP: 'DP / UANG MUKA', LUNAS: 'LUNAS' };
    const STAMP_LABEL = { UNPAID: 'BELUM BAYAR', DP: 'DP', LUNAS: 'LUNAS' };
    const BADGE_TEXT = { UNPAID: 'text-rose-600', DP: 'text-amber-600', LUNAS: 'text-emerald-600' };
    const BADGE_CLASS = {
        UNPAID: 'bg-rose-100 text-rose-800 border-rose-200',
        DP: 'bg-amber-100 text-amber-800 border-amber-200',
        LUNAS: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };

    const STAMP_BASE = 'absolute text-2xl font-black tracking-widest border-4 rounded-lg px-3 py-1 -rotate-12';
    const STAMP_STYLE = {
        UNPAID: 'text-rose-600/60 border-rose-600/60',
        DP: 'text-amber-600/70 border-amber-600/70',
        LUNAS: 'text-emerald-600/60 border-emerald-600/60'
    };

    /* ---------- Helper umum ---------- */
    const $ = (id) => document.getElementById(id);

    function setText(id, text) {
        const n = $(id);
        if (n) n.textContent = text;
    }
    function setVal(id, value) {
        const n = $(id);
        if (n) n.value = value ?? '';
    }
    function setHidden(id, hide) {
        const n = $(id);
        if (n) n.classList.toggle('hidden', !!hide);
    }
    function toggleClasses(node, on, onList, offList) {
        if (!node) return;
        onList.forEach((c) => node.classList.toggle(c, on));
        offList.forEach((c) => node.classList.toggle(c, !on));
    }
    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function todayISO() {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 10);
    }
    function formatRp(n) {
        return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
    }
    function formatTanggal(iso) {
        if (!iso) return '-';
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d)) return '-';
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    function loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }
    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            showToast('Penyimpanan browser penuh atau diblokir', 'error');
            return false;
        }
    }
    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(r.error);
            r.readAsDataURL(file);
        });
    }
    function downloadFile(name, obj) {
        const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function isMobile() {
        return window.matchMedia('(max-width: 1023px)').matches;
    }

    /* ---------- Toast ---------- */
    function showToast(msg, type = 'success') {
        const box = $('toast-container');
        if (!box) return;
        const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-slate-800' };
        const t = document.createElement('div');
        t.className = `px-4 py-2.5 rounded-lg shadow-lg text-white text-xs sm:text-sm font-medium transition-opacity duration-300 ${colors[type] || colors.success}`;
        t.textContent = msg;
        box.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 2800);
    }

    /* ---------- Data & state ---------- */
    function defaultCompany() {
        return {
            name: 'PT. NUSANTARA TRANSWISATA',
            tagline: 'Layanan Sewa Bus Pariwisata, Hiace & Paket Tour Profesional',
            addr1Label: 'Kantor Pusat:',
            addr1: '',
            addr2Label: 'Pool Armada:',
            addr2: '',
            wa: '',
            ig: '',
            email: '',
            logo: null
        };
    }
    function emptyInvoice() {
        return {
            number: '',
            date: todayISO(),
            status: 'UNPAID',
            dp: 0,
            customer: { name: '', phone: '', address: '' },
            items: [{ qty: 1, desc: '', days: 1, price: 0 }],
            bankInfo: '',
            notes: '',
            signCity: 'Yogyakarta',
            signName: 'Admin Reservasi'
        };
    }
    function normalizeInvoice(src) {
        const base = emptyInvoice();
        const s = src || {};
        return {
            ...base,
            ...s,
            dp: Number(s.dp) || 0,
            customer: { ...base.customer, ...(s.customer || {}) },
            items: Array.isArray(s.items) && s.items.length
                ? s.items.map((i) => ({
                    qty: Number(i.qty) || 0,
                    desc: String(i.desc || ''),
                    days: Number(i.days) || 0,
                    price: Number(i.price) || 0
                }))
                : base.items
        };
    }

    const state = {
        company: defaultCompany(),
        stamp: { type: 'TEXT', image: null },
        signature: null,
        invoice: emptyInvoice(),
        historyFilter: 'ALL',
        mobileView: 'editor'
    };

    function calcItemTotal(it) {
        return (Number(it.qty) || 0) * (Number(it.days) || 0) * (Number(it.price) || 0);
    }
    function calcTotals(inv) {
        const grand = inv.items.reduce((sum, it) => sum + calcItemTotal(it), 0);
        let dp = inv.status === 'LUNAS' ? grand : inv.status === 'UNPAID' ? 0 : (Number(inv.dp) || 0);
        dp = Math.min(Math.max(dp, 0), grand);
        return { grand, dp, balance: grand - dp };
    }
    function nextInvoiceNumber(dateISO) {
        const date = dateISO || todayISO();
        const prefix = `INV/TW/${date.slice(0, 4)}${date.slice(5, 7)}/`;
        const history = loadJSON(KEY.history, []);
        let max = 0;
        history.forEach((h) => {
            const num = String(h.number || '');
            if (num.startsWith(prefix)) {
                const n = parseInt(num.slice(prefix.length), 10);
                if (!isNaN(n) && n > max) max = n;
            }
        });
        return prefix + String(max + 1).padStart(3, '0');
    }

    /* ---------- Persistensi ---------- */
    function persistActive() {
        saveJSON(KEY.active, state.invoice);
    }
    function persistCompany() {
        saveJSON(KEY.company, { company: state.company, stamp: state.stamp, signature: state.signature });
    }

    /* ---------- Sinkron input <-> state ---------- */
    function readInputs() {
        const c = state.company;
        const inv = state.invoice;
        c.name = $('in-comp-name').value;
        c.tagline = $('in-comp-tagline').value;
        c.addr1Label = $('in-addr1-label').value;
        c.addr1 = $('in-comp-addr1').value;
        c.addr2Label = $('in-addr2-label').value;
        c.addr2 = $('in-comp-addr2').value;
        c.wa = $('in-comp-wa').value;
        c.ig = $('in-comp-ig').value;
        c.email = $('in-comp-email').value;

        inv.number = $('in-inv-number').value;
        inv.date = $('in-inv-date').value;
        inv.customer.name = $('in-cust-name').value;
        inv.customer.phone = $('in-cust-phone').value;
        inv.customer.address = $('in-cust-address').value;
        inv.dp = Number($('in-dp-amount').value) || 0;
        inv.bankInfo = $('in-bank-info').value;
        inv.notes = $('in-notes').value;
        inv.signCity = $('in-sign-city').value;
        inv.signName = $('in-sign-name').value;
    }

    function writeInputs() {
        const c = state.company;
        const inv = state.invoice;
        setVal('in-comp-name', c.name);
        setVal('in-comp-tagline', c.tagline);
        setVal('in-addr1-label', c.addr1Label);
        setVal('in-comp-addr1', c.addr1);
        setVal('in-addr2-label', c.addr2Label);
        setVal('in-comp-addr2', c.addr2);
        setVal('in-comp-wa', c.wa);
        setVal('in-comp-ig', c.ig);
        setVal('in-comp-email', c.email);

        setVal('in-inv-number', inv.number);
        setVal('in-inv-date', inv.date);
        setVal('in-cust-name', inv.customer.name);
        setVal('in-cust-phone', inv.customer.phone);
        setVal('in-cust-address', inv.customer.address);
        setVal('in-dp-amount', inv.dp || 0);
        setVal('in-bank-info', inv.bankInfo);
        setVal('in-notes', inv.notes);
        setVal('in-sign-city', inv.signCity);
        setVal('in-sign-name', inv.signName);
    }

    /* ---------- Render preview ---------- */
    function renderPreviewItems(items) {
        const tb = $('prev-items-tbody');
        if (!tb) return;
        if (!items.length) {
            tb.innerHTML = '<tr><td colspan="5" class="py-4 px-3 text-center text-slate-400">Belum ada item</td></tr>';
            return;
        }
        tb.innerHTML = items.map((it) => `
            <tr>
                <td class="py-2.5 px-2 sm:px-3 text-center">${esc(it.qty)}</td>
                <td class="py-2.5 px-2 sm:px-3 font-medium text-slate-800">${esc(it.desc)}</td>
                <td class="py-2.5 px-2 sm:px-3 text-center">${esc(it.days)}</td>
                <td class="py-2.5 px-2 sm:px-3 text-right whitespace-nowrap">${formatRp(it.price)}</td>
                <td class="py-2.5 px-2 sm:px-3 text-right font-semibold whitespace-nowrap">${formatRp(calcItemTotal(it))}</td>
            </tr>`).join('');
    }

    function render() {
        const c = state.company;
        const inv = state.invoice;
        const t = calcTotals(inv);

        // Header perusahaan
        setText('prev-comp-name', c.name);
        setText('prev-comp-tagline', c.tagline);
        setHidden('prev-comp-tagline', !c.tagline);
        setText('prev-addr1-label', c.addr1Label);
        setText('prev-comp-addr1', c.addr1);
        setHidden('prev-addr1-wrap', !c.addr1);
        setText('prev-addr2-label', c.addr2Label);
        setText('prev-comp-addr2', c.addr2);
        setHidden('prev-addr2-wrap', !c.addr2);
        setText('prev-comp-wa', c.wa);
        setHidden('prev-wa-wrap', !c.wa);
        setText('prev-comp-ig', c.ig);
        setHidden('prev-ig-wrap', !c.ig);
        setText('prev-comp-email', c.email);
        setHidden('prev-email-wrap', !c.email);
        setHidden('prev-contact-row', !(c.wa || c.ig || c.email));

        // Logo
        const logo = $('prev-logo-img');
        if (logo) {
            if (c.logo) {
                logo.src = c.logo;
                logo.classList.remove('hidden');
            } else {
                logo.removeAttribute('src');
                logo.classList.add('hidden');
            }
        }
        setHidden('prev-logo-placeholder', !!c.logo);

        // Badge status & info invoice
        const badge = $('prev-status-badge');
        if (badge) {
            badge.textContent = STATUS_LABEL[inv.status];
            badge.className = 'text-sm font-extrabold tracking-wider ' + BADGE_TEXT[inv.status];
        }
        setText('prev-inv-number', inv.number || '-');
        setText('prev-inv-date', formatTanggal(inv.date));

        // Customer & pembayaran
        setText('prev-cust-name', inv.customer.name || '-');
        setText('prev-cust-phone', inv.customer.phone || '-');
        setText('prev-cust-address', inv.customer.address || '-');
        setText('prev-bank-info', inv.bankInfo);
        setHidden('prev-bank-wrap', !inv.bankInfo.trim());

        // Item & ringkasan
        renderPreviewItems(inv.items);
        setText('prev-subtotal', formatRp(t.grand));
        setText('prev-grand-total', formatRp(t.grand));
        setText('prev-dp-amount', '- ' + formatRp(t.dp));
        setText('prev-balance-due', formatRp(t.balance));

        // Catatan & tanda tangan
        setText('prev-notes', inv.notes);
        setText('prev-sign-city', inv.signCity || '-');
        setText('prev-sign-date', formatTanggal(inv.date));
        setText('prev-sign-name', inv.signName);
        setText('prev-sign-comp', c.name);
        const signImg = $('prev-sign-img');
        if (signImg) {
            if (state.signature) {
                signImg.src = state.signature;
                signImg.classList.remove('hidden');
            } else {
                signImg.removeAttribute('src');
                signImg.classList.add('hidden');
            }
        }

        // Stempel
        const useImg = state.stamp.type === 'IMAGE' && !!state.stamp.image;
        const stampSpan = $('prev-lunas-stamp');
        const stampImg = $('prev-lunas-stamp-img');
        if (stampSpan) {
            stampSpan.textContent = STAMP_LABEL[inv.status];
            stampSpan.className = STAMP_BASE + ' ' + STAMP_STYLE[inv.status];
            stampSpan.classList.toggle('hidden', useImg);
        }
        if (stampImg) {
            if (useImg) {
                stampImg.src = state.stamp.image;
                stampImg.classList.remove('hidden');
            } else {
                stampImg.removeAttribute('src');
                stampImg.classList.add('hidden');
            }
        }
    }

    function updatePreview() {
        readInputs();
        render();
        persistActive();
    }

    /* ---------- Editor item ---------- */
    function renderItemEditor() {
        const list = $('items-editor-list');
        if (!list) return;
        const items = state.invoice.items;
        list.innerHTML = items.length
            ? items.map((it, i) => `
                <div class="grid grid-cols-12 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
                    <div class="col-span-12 flex items-center justify-between">
                        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Item ${i + 1}</span>
                        <button type="button" data-remove="${i}" class="text-xs text-rose-600 hover:underline font-medium">Hapus</button>
                    </div>
                    <div class="col-span-12">
                        <input type="text" data-field="desc" data-index="${i}" value="${esc(it.desc)}" placeholder="Contoh: Bus Pariwisata 45 Seat, rute Jogja - Bromo" class="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="col-span-3">
                        <label class="block text-[11px] font-medium text-slate-500 mb-1">Qty</label>
                        <input type="number" min="0" data-field="qty" data-index="${i}" value="${esc(it.qty)}" class="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="col-span-3">
                        <label class="block text-[11px] font-medium text-slate-500 mb-1">Hari</label>
                        <input type="number" min="0" data-field="days" data-index="${i}" value="${esc(it.days)}" class="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="col-span-6">
                        <label class="block text-[11px] font-medium text-slate-500 mb-1">Harga / Hari (Rp)</label>
                        <input type="number" min="0" step="10000" data-field="price" data-index="${i}" value="${esc(it.price)}" class="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="col-span-12 text-right text-xs text-slate-600">
                        Total: <span data-total="${i}" class="font-semibold text-slate-900">${formatRp(calcItemTotal(it))}</span>
                    </div>
                </div>`).join('')
            : '<p class="text-xs text-slate-400 text-center py-4">Belum ada item. Klik "Tambah Baris".</p>';
    }

    function onItemInput(e) {
        const t = e.target;
        const field = t.dataset.field;
        if (!field) return;
        const i = Number(t.dataset.index);
        const it = state.invoice.items[i];
        if (!it) return;
        it[field] = field === 'desc' ? t.value : (Number(t.value) || 0);
        const tot = $('items-editor-list').querySelector(`[data-total="${i}"]`);
        if (tot) tot.textContent = formatRp(calcItemTotal(it));
        updatePreview();
    }

    function onItemClick(e) {
        const btn = e.target.closest('[data-remove]');
        if (!btn) return;
        state.invoice.items.splice(Number(btn.dataset.remove), 1);
        renderItemEditor();
        updatePreview();
    }

    function addItemRow() {
        readInputs();
        state.invoice.items.push({ qty: 1, desc: '', days: 1, price: 0 });
        renderItemEditor();
        updatePreview();
        const descs = $('items-editor-list').querySelectorAll('[data-field="desc"]');
        if (descs.length) descs[descs.length - 1].focus();
    }

    /* ---------- Status pembayaran ---------- */
    function writeDpInput() {
        setVal('in-dp-amount', state.invoice.dp || 0);
    }

    function setPaymentStatus(status) {
        const inv = state.invoice;
        inv.status = status;
        if (status === 'UNPAID') inv.dp = 0;
        if (status === 'LUNAS') inv.dp = calcTotals(inv).grand;
        ['UNPAID', 'DP', 'LUNAS'].forEach((s) => {
            const b = $('status-btn-' + s);
            if (b) b.classList.toggle('is-active', s === status);
        });
        setHidden('dp-input-wrapper', status !== 'DP');
        writeDpInput();
        updatePreview();
    }

    function setFullPayment() {
        const inv = state.invoice;
        inv.dp = calcTotals(inv).grand;
        if (inv.status === 'UNPAID') inv.status = 'DP';
        setPaymentStatus(inv.status);
    }

    function onDpInput() {
        updatePreview();
    }

    /* ---------- Logo & stempel ---------- */
    function refreshLogoUI() {
        setHidden('btn-remove-logo', !state.company.logo);
    }

    function handleLogoUpload(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        readFileAsDataURL(file)
            .then((url) => {
                state.company.logo = url;
                refreshLogoUI();
                updatePreview();
            })
            .catch(() => showToast('Gagal membaca file logo', 'error'));
    }

    function removeLogo() {
        state.company.logo = null;
        refreshLogoUI();
        updatePreview();
    }

    function setLunasStampType(type) {
        state.stamp.type = type;
        const active = ['border-blue-600', 'bg-blue-50', 'text-blue-700'];
        const inactive = ['border-slate-300', 'bg-white', 'text-slate-600'];
        toggleClasses($('stamp-type-btn-TEXT'), type === 'TEXT', active, inactive);
        toggleClasses($('stamp-type-btn-IMAGE'), type === 'IMAGE', active, inactive);
        setHidden('custom-stamp-upload-wrap', type !== 'IMAGE');
        updatePreview();
    }

    function refreshStampUI() {
        const has = !!state.stamp.image;
        const img = $('stamp-thumb-preview');
        if (img && has) img.src = state.stamp.image;
        setHidden('stamp-thumb-preview-wrap', !has);
        setHidden('btn-remove-stamp', !has);
    }

    function handleStampUpload(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        readFileAsDataURL(file)
            .then((url) => {
                state.stamp.image = url;
                refreshStampUI();
                updatePreview();
            })
            .catch(() => showToast('Gagal membaca file stempel', 'error'));
    }

    function removeCustomStamp() {
        state.stamp.image = null;
        refreshStampUI();
        updatePreview();
    }

    /* ---------- Tanda tangan gambar ---------- */
    function refreshSignUI() {
        setHidden('btn-remove-sign', !state.signature);
    }

    function handleSignatureUpload(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        readFileAsDataURL(file)
            .then((url) => {
                state.signature = url;
                refreshSignUI();
                persistCompany();
                updatePreview();
            })
            .catch(() => showToast('Gagal membaca file tanda tangan', 'error'));
    }

    function removeSignature() {
        state.signature = null;
        refreshSignUI();
        persistCompany();
        updatePreview();
    }

    /* ---------- Nomor invoice ---------- */
    function generateAutoInvoiceNumber(showMsg) {
        const date = $('in-inv-date').value || state.invoice.date || todayISO();
        state.invoice.number = nextInvoiceNumber(date);
        setVal('in-inv-number', state.invoice.number);
        updatePreview();
        if (showMsg) showToast('Nomor invoice: ' + state.invoice.number);
    }

    function createNewInvoice() {
        if (!confirm('Buat invoice baru? Data form yang belum disimpan ke riwayat akan hilang.')) return;
        state.invoice = emptyInvoice();
        state.invoice.number = nextInvoiceNumber(state.invoice.date);
        writeInputs();
        renderItemEditor();
        setPaymentStatus('UNPAID');
        switchTab('transaksi');
        showToast('Invoice baru dibuat');
    }

    /* ---------- Tab & tampilan mobile ---------- */
    function switchTab(name) {
        TABS.forEach((t) => {
            const content = $('tab-content-' + t);
            const btn = $('tab-btn-' + t);
            const on = t === name;
            if (content) content.classList.toggle('hidden', !on);
            toggleClasses(btn, on,
                ['bg-blue-50', 'text-blue-700', 'font-semibold'],
                ['font-medium', 'text-slate-600', 'hover:bg-slate-50']);
        });
        if (name === 'riwayat') renderHistoryList();
    }

    function applyMobileView() {
        const editor = $('editor-panel');
        const preview = $('preview-panel');
        if (!editor || !preview) return;
        if (!isMobile()) {
            editor.classList.remove('hidden');
            preview.classList.remove('hidden');
            return;
        }
        const showPreview = state.mobileView === 'preview';
        editor.classList.toggle('hidden', showPreview);
        preview.classList.toggle('hidden', !showPreview);
        setText('mobile-toggle-text', showPreview ? 'Editor' : 'Preview');
    }

    function toggleMobileView() {
        state.mobileView = state.mobileView === 'preview' ? 'editor' : 'preview';
        applyMobileView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ---------- Menu export ---------- */
    function toggleExportMenu(force) {
        const menu = $('export-menu');
        if (!menu) return;
        const show = typeof force === 'boolean' ? force : menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !show);
    }

    // Pastikan kertas invoice terlihat saat cetak/ekspor (penting di mobile)
    async function withPreviewVisible(fn) {
        const preview = $('preview-panel');
        const wasHidden = preview.classList.contains('hidden');
        if (wasHidden) preview.classList.remove('hidden');
        try {
            return await fn();
        } finally {
            if (wasHidden && isMobile()) preview.classList.add('hidden');
        }
    }

    function printInvoice() {
        withPreviewVisible(() => window.print());
    }

    function fileBaseName() {
        return 'Invoice-' + (state.invoice.number || 'draft').replace(/[\\/:*?"<>|\s]+/g, '-');
    }

    // Render invoice ke kanvas A4 (794 x 1123 px) dengan lebar tetap, tidak tergantung layar
    async function captureA4() {
        const src = $('invoice-paper-target');
        const clone = src.cloneNode(true);
        clone.removeAttribute('id');
        clone.style.width = '794px';
        clone.style.maxWidth = 'none';
        clone.style.margin = '0';
        clone.style.boxShadow = 'none';
        clone.style.position = 'fixed';
        clone.style.left = '-10000px';
        clone.style.top = '0';
        document.body.appendChild(clone);
        try {
            const c = await html2canvas(clone, {
                scale: 2,
                backgroundColor: '#ffffff',
                width: 794,
                windowWidth: 794,
                useCORS: true
            });
            const PAGE_W = 794 * 2;
            const PAGE_H = 1123 * 2;
            const page = document.createElement('canvas');
            page.width = PAGE_W;
            page.height = PAGE_H;
            const ctx = page.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, PAGE_W, PAGE_H);
            const s = Math.min(1, PAGE_H / c.height, PAGE_W / c.width);
            const w = c.width * s;
            const hgt = c.height * s;
            ctx.drawImage(c, (PAGE_W - w) / 2, 0, w, hgt);
            return page;
        } finally {
            clone.remove();
        }
    }

    async function exportToPDF() {
        if (!window.jspdf || !window.jspdf.jsPDF || typeof html2canvas !== 'function') {
            showToast('Library PDF belum termuat, cek koneksi internet', 'error');
            return;
        }
        showToast('Menyiapkan PDF...', 'info');
        try {
            const page = await captureA4();
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            pdf.addImage(page.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
            pdf.save(fileBaseName() + '.pdf');
            showToast('PDF berhasil diunduh');
        } catch (err) {
            console.error(err);
            showToast('Gagal membuat PDF', 'error');
        }
    }

    async function exportToJPG() {
        if (typeof html2canvas !== 'function') {
            showToast('Library gambar belum termuat, cek koneksi internet', 'error');
            return;
        }
        showToast('Menyiapkan gambar...', 'info');
        try {
            const page = await captureA4();
            const a = document.createElement('a');
            a.href = page.toDataURL('image/jpeg', 0.92);
            a.download = fileBaseName() + '.jpg';
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast('Gambar berhasil diunduh');
        } catch (err) {
            console.error(err);
            showToast('Gagal membuat gambar', 'error');
        }
    }

    /* ---------- Profil perusahaan ---------- */
    function saveCompanyProfile() {
        readInputs();
        persistCompany();
        persistActive();
        showToast('Profil perusahaan disimpan di browser');
    }

    /* ---------- Riwayat (mini POS) ---------- */
    function updateStats() {
        const history = loadJSON(KEY.history, []);
        let paid = 0;
        let unpaid = 0;
        history.forEach((h) => {
            const t = calcTotals(h);
            paid += t.dp;
            unpaid += t.balance;
        });
        setText('pos-stat-count', String(history.length));
        setText('pos-stat-paid', formatRp(paid));
        setText('pos-stat-unpaid', formatRp(unpaid));
        setText('history-count-badge', String(history.length));
    }

    function renderHistoryList() {
        const list = $('pos-history-list');
        if (!list) return;
        const q = ($('pos-search-input').value || '').toLowerCase().trim();
        const data = loadJSON(KEY.history, []).filter((h) => {
            if (state.historyFilter !== 'ALL' && h.status !== state.historyFilter) return false;
            if (!q) return true;
            const hay = [h.number, h.customer && h.customer.name, ...(h.items || []).map((i) => i.desc)]
                .join(' ').toLowerCase();
            return hay.includes(q);
        });

        if (!data.length) {
            list.innerHTML = '<div class="text-center text-xs text-slate-400 py-8">Belum ada invoice yang cocok.</div>';
        } else {
            list.innerHTML = data.map((h) => {
                const t = calcTotals(h);
                return `
                <div data-load="${esc(h.number)}" class="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-mono text-xs font-bold text-slate-900 truncate">${esc(h.number)}</p>
                            <p class="text-xs text-slate-600 truncate">${esc((h.customer && h.customer.name) || '-')}</p>
                            <p class="text-[10px] text-slate-400">${formatTanggal(h.date)}</p>
                        </div>
                        <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_CLASS[h.status] || ''}">${STATUS_LABEL[h.status] || esc(h.status)}</span>
                    </div>
                    <div class="mt-2 flex items-center justify-between text-xs">
                        <span class="text-slate-500">Total ${formatRp(t.grand)}</span>
                        <span class="font-semibold ${t.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}">${t.balance > 0 ? 'Sisa ' + formatRp(t.balance) : 'Lunas'}</span>
                    </div>
                    <div class="mt-2 flex justify-end">
                        <button type="button" data-del="${esc(h.number)}" class="text-[11px] text-rose-600 hover:underline font-medium">Hapus</button>
                    </div>
                </div>`;
            }).join('');
        }
        updateStats();
    }

    function onHistoryClick(e) {
        const del = e.target.closest('[data-del]');
        if (del) {
            e.stopPropagation();
            deleteHistoryItem(del.dataset.del);
            return;
        }
        const card = e.target.closest('[data-load]');
        if (card) loadHistoryInvoice(card.dataset.load);
    }

    function setHistoryFilter(f) {
        state.historyFilter = f;
        document.querySelectorAll('.hist-filter-btn').forEach((b) => {
            const on = b.id === 'hist-filter-' + f;
            b.classList.toggle('bg-slate-800', on);
            b.classList.toggle('text-white', on);
            b.classList.toggle('bg-slate-100', !on);
            b.classList.toggle('text-slate-600', !on);
        });
        renderHistoryList();
    }

    function saveInvoiceToHistory() {
        readInputs();
        const inv = state.invoice;
        if (!inv.number.trim()) {
            showToast('Nomor invoice belum diisi', 'error');
            return;
        }
        if (calcTotals(inv).grand <= 0) {
            showToast('Total masih Rp 0, periksa item', 'error');
            return;
        }
        const history = loadJSON(KEY.history, []);
        const entry = { ...JSON.parse(JSON.stringify(inv)), savedAt: new Date().toISOString() };
        const idx = history.findIndex((h) => h.number === inv.number);
        if (idx >= 0) history[idx] = entry;
        else history.unshift(entry);
        if (saveJSON(KEY.history, history)) {
            showToast(idx >= 0 ? 'Invoice diperbarui di riwayat' : 'Invoice disimpan ke riwayat');
            renderHistoryList();
        }
    }

    function loadHistoryInvoice(number) {
        const h = loadJSON(KEY.history, []).find((x) => x.number === number);
        if (!h) return;
        const { savedAt, ...rest } = h;
        state.invoice = normalizeInvoice(rest);
        writeInputs();
        renderItemEditor();
        setPaymentStatus(state.invoice.status);
        switchTab('transaksi');
        showToast('Invoice ' + number + ' dimuat');
        if (isMobile()) {
            state.mobileView = 'preview';
            applyMobileView();
        }
    }

    function deleteHistoryItem(number) {
        if (!confirm('Hapus invoice ' + number + ' dari riwayat?')) return;
        const history = loadJSON(KEY.history, []).filter((h) => h.number !== number);
        saveJSON(KEY.history, history);
        renderHistoryList();
        showToast('Invoice dihapus');
    }

    /* ---------- Backup & restore JSON ---------- */
    function applyCompanyAndStamp(data) {
        if (data.company) state.company = { ...defaultCompany(), ...data.company };
        if (data.stamp) state.stamp = { type: data.stamp.type || 'TEXT', image: data.stamp.image || null };
    }

    function writeAll() {
        writeInputs();
        refreshLogoUI();
        refreshStampUI();
        refreshSignUI();
        setLunasStampType(state.stamp.type);
        renderItemEditor();
        setPaymentStatus(state.invoice.status);
    }

    function downloadJsonBackup() {
        readInputs();
        downloadFile(`backup-invoice-${todayISO()}.json`, {
            app: 'transwisata-invoice',
            version: 1,
            type: 'single',
            company: state.company,
            stamp: state.stamp,
            invoice: state.invoice
        });
        showToast('File backup tersimpan');
    }

    async function uploadJsonBackup(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            if (!data.invoice && !data.company) throw new Error('format');
            applyCompanyAndStamp(data);
            if (data.invoice) state.invoice = normalizeInvoice(data.invoice);
            writeAll();
            showToast('Data berhasil dimuat');
        } catch (err) {
            showToast('File JSON tidak valid', 'error');
        }
    }

    function exportAllHistoryJson() {
        readInputs();
        downloadFile(`riwayat-invoice-${todayISO()}.json`, {
            app: 'transwisata-invoice',
            version: 1,
            type: 'history',
            company: state.company,
            stamp: state.stamp,
            history: loadJSON(KEY.history, [])
        });
        showToast('Backup riwayat tersimpan');
    }

    async function importAllHistoryJson(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            if (!Array.isArray(data.history)) throw new Error('format');
            const map = new Map();
            loadJSON(KEY.history, []).forEach((h) => map.set(h.number, h));
            data.history.forEach((h) => {
                if (h && h.number) map.set(h.number, h);
            });
            const merged = [...map.values()]
                .sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
            saveJSON(KEY.history, merged);
            renderHistoryList();
            showToast(data.history.length + ' invoice berhasil diimpor');
        } catch (err) {
            showToast('File riwayat tidak valid', 'error');
        }
    }

    /* ---------- Inisialisasi ---------- */
    function bindEvents() {
        const list = $('items-editor-list');
        list.addEventListener('input', onItemInput);
        list.addEventListener('click', onItemClick);
        $('pos-history-list').addEventListener('click', onHistoryClick);
        window.addEventListener('resize', applyMobileView);
        document.addEventListener('click', (e) => {
            const wrapper = $('export-dropdown-wrapper');
            if (wrapper && !wrapper.contains(e.target)) toggleExportMenu(false);
        });
    }

    function init() {
        const savedCompany = loadJSON(KEY.company, null);
        if (savedCompany) {
            state.company = { ...defaultCompany(), ...(savedCompany.company || {}) };
            state.signature = savedCompany.signature || null;
            if (savedCompany.stamp) {
                state.stamp = { type: savedCompany.stamp.type || 'TEXT', image: savedCompany.stamp.image || null };
            }
        }

        const savedActive = loadJSON(KEY.active, null);
        state.invoice = savedActive ? normalizeInvoice(savedActive) : emptyInvoice();
        if (!state.invoice.number) state.invoice.number = nextInvoiceNumber(state.invoice.date);

        writeAll();
        setHistoryFilter('ALL');
        switchTab('transaksi');
        applyMobileView();
        bindEvents();
        if (window.lucide) window.lucide.createIcons();
        updateStats();
    }

    /* ---------- Ekspos fungsi untuk onclick di index.html ---------- */
    Object.assign(window, {
        switchTab, toggleMobileView, createNewInvoice, saveCompanyProfile,
        toggleExportMenu, printInvoice, exportToPDF, exportToJPG,
        generateAutoInvoiceNumber, updatePreview, addItemRow, saveInvoiceToHistory,
        removeLogo, handleLogoUpload, setPaymentStatus, setLunasStampType,
        handleStampUpload, removeCustomStamp, handleSignatureUpload, removeSignature,
        setFullPayment, onDpInput,
        downloadJsonBackup, uploadJsonBackup, renderHistoryList, setHistoryFilter,
        exportAllHistoryJson, importAllHistoryJson
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
