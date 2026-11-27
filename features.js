/* S&S Journal — Edition 75: trade-form stepper + personal checklist builder */
(() => {
  'use strict';
  const faN = n => Number(n).toLocaleString('fa-IR');
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const toast = m => { if (typeof showToast === 'function') showToast(m); };
  const rid = () => Math.random().toString(36).slice(2, 9);
  const plain = html => { const d = document.createElement('div'); d.innerHTML = String(html || ''); return d.textContent.trim(); };

  /* =================== Trade form stepper =================== */
  function initStepper() {
    const form = document.getElementById('tradeForm');
    if (!form || document.getElementById('formStepper')) return;
    const blocks = [...form.querySelectorAll(':scope > fieldset.form-block')];
    if (blocks.length < 3) return;
    const nav = document.createElement('nav');
    nav.id = 'formStepper'; nav.className = 'form-stepper'; nav.setAttribute('aria-label', 'مراحل ثبت معامله');
    nav.innerHTML = ['اطلاعات', 'چک‌لیست', 'نتیجه'].map((n, i) =>
      `<button type="button" data-step="${i}"><span class="fs-dot">${faN(i + 1)}</span><span class="fs-label">${n}</span></button>`
    ).join('<i class="fs-line" aria-hidden="true"></i>');
    form.before(nav);
    const btns = [...nav.querySelectorAll('[data-step]')], lines = [...nav.querySelectorAll('.fs-line')];
    nav.addEventListener('click', e => {
      const b = e.target.closest('[data-step]'); if (!b) return;
      const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--kzh')) || 56;
      scrollTo({ top: blocks[+b.dataset.step].getBoundingClientRect().top + scrollY - nav.offsetHeight - bar - 24, behavior: 'smooth' });
    });
    const val = id => (document.getElementById(id)?.value || '').trim();
    function update() {
      const rows = [...document.querySelectorAll('#formChecklist .cl-row')];
      const done = [
        !!val('f-date'),
        rows.length > 0 && rows.every(r => r.classList.contains('done') || r.classList.contains('skipped')),
        (typeof getSeg === 'function' && getSeg('segResult') === 'be') || val('f-rr') !== ''
      ];
      btns.forEach((b, i) => b.classList.toggle('done', done[i]));
      lines.forEach((l, i) => l.classList.toggle('filled', done[i]));
      let active = 0;
      blocks.forEach((b, i) => { if (b.getBoundingClientRect().top < innerHeight * 0.45) active = i; });
      btns.forEach((b, i) => b.classList.toggle('active', i === active));
    }
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    addEventListener('scroll', schedule, { passive: true });
    form.addEventListener('input', schedule);
    form.addEventListener('click', () => setTimeout(schedule, 0));
    const cl = document.getElementById('formChecklist');
    if (cl) new MutationObserver(schedule).observe(cl, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    update();
  }

  /* =================== Personal checklist builder =================== */
  const LIB_MODELS = ['crt48', 'cisd48', 'mss48'];   // public models only — the owner's private model is never listed
  const TF = ['15m', '5m', '1m', ''];
  let dlg = null, model = null, lib = [], dragFrom = null;

  function library() {
    return LIB_MODELS.filter(id => SETUPS[id]).map(id => ({
      id, label: plain(SETUPS[id].label),
      steps: SETUPS[id].steps.filter(s => (s.items || []).length).map(s => ({
        title: plain(s.title), tf: s.tf || '', multi: !!s.multi, options: s.items.map(it => plain(it.label))
      }))
    }));
  }

  function build() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'cxb'; dlg.dir = 'rtl'; dlg.setAttribute('aria-labelledby', 'cxbTitle');
    dlg.innerHTML = `
      <header class="cxb-head"><div><span class="cxb-eyebrow en">PERSONAL CHECKLIST</span><h2 id="cxbTitle">ساخت چک‌لیست من</h2></div><button type="button" class="btn" data-cx="close" aria-label="بستن">✕</button></header>
      <div class="cxb-name"><label for="cxbName">نام چک‌لیست</label><input id="cxbName" maxlength="40"></div>
      <div class="cxb-tabs"><button type="button" class="on" data-cx-tab="mine">مراحل من <b id="cxbCount"></b></button><button type="button" data-cx-tab="lib">کتابخانه‌ی مراحل</button></div>
      <div class="cxb-body">
        <section class="cxb-mine"><div id="cxbSteps"></div><button type="button" class="cxb-add-blank" data-cx="blank">+ مرحله‌ی جدید از صفر</button></section>
        <section class="cxb-lib" id="cxbLib"></section>
      </div>
      <footer class="cxb-foot"><button type="button" class="btn btn-danger" data-cx="delete">حذف چک‌لیست</button><span></span><button type="button" class="btn btn-ghost" data-cx="close">انصراف</button><button type="button" class="btn btn-primary" data-cx="save">ذخیره چک‌لیست</button></footer>`;
    document.body.append(dlg);
    dlg.addEventListener('keydown', e => e.stopPropagation());   // keep app shortcuts (Esc, 1–6, n) away from the builder
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('input', onInput);
    dlg.addEventListener('change', onInput);
    dlg.addEventListener('pointerdown', e => { const h = e.target.closest('.cxb-handle'); if (h) h.closest('.cxb-step').draggable = true; });
    dlg.addEventListener('dragstart', e => { const s = e.target.closest?.('.cxb-step'); if (!s) return; dragFrom = +s.dataset.i; s.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', 'step'); } catch (_) {} });
    dlg.addEventListener('dragover', e => { const s = e.target.closest?.('.cxb-step'); if (dragFrom === null || !s) return; e.preventDefault(); dlg.querySelectorAll('.cxb-step.drop').forEach(x => x.classList.remove('drop')); s.classList.add('drop'); });
    dlg.addEventListener('drop', e => { const s = e.target.closest?.('.cxb-step'); if (dragFrom === null || !s) return; e.preventDefault(); const [m] = model.steps.splice(dragFrom, 1); model.steps.splice(+s.dataset.i, 0, m); dragFrom = null; renderSteps(); });
    dlg.addEventListener('dragend', () => { dragFrom = null; dlg.querySelectorAll('.cxb-step').forEach(x => { x.draggable = false; x.classList.remove('dragging', 'drop'); }); });
  }

  function open(listId) {
    if (typeof customChecklists === 'undefined' || typeof registerCustomChecklists !== 'function') { toast('ابتدا تغییرات app.js را اعمال کن.'); return; }
    const src = listId ? customChecklists.find(c => c.id === listId) : null;
    model = src ? JSON.parse(JSON.stringify(src)) : { id: rid(), name: 'چک‌لیست من', version: 0, steps: [] };
    model.isNew = !src;
    lib = library();
    build();
    dlg.dataset.tab = 'mine';
    dlg.querySelectorAll('[data-cx-tab]').forEach(x => x.classList.toggle('on', x.dataset.cxTab === 'mine'));
    dlg.querySelector('#cxbTitle').textContent = src ? 'ویرایش چک‌لیست' : 'ساخت چک‌لیست من';
    render();
    dlg.showModal();
  }

  function render() {
    dlg.querySelector('#cxbName').value = model.name;
    dlg.querySelector('[data-cx="delete"]').hidden = model.isNew;
    dlg.querySelector('#cxbCount').textContent = model.steps.length ? faN(model.steps.length) : '';
    renderSteps(); renderLib();
  }
  function renderSteps() {
    dlg.querySelector('#cxbCount').textContent = model.steps.length ? faN(model.steps.length) : '';
    const host = dlg.querySelector('#cxbSteps');
    if (!model.steps.length) { host.innerHTML = '<div class="cxb-empty">هنوز مرحله‌ای اضافه نکرده‌ای. از کتابخانه‌ی مراحل انتخاب کن یا یک مرحله‌ی جدید بساز.</div>'; return; }
    host.innerHTML = model.steps.map((s, i) => `
      <article class="cxb-step" data-i="${i}">
        <div class="cxb-step-top">
          <span class="cxb-handle" title="برای جابه‌جایی بکش" aria-hidden="true">⋮⋮</span>
          <span class="cxb-num en">${i + 1}</span>
          <input class="cxb-title" data-f="title" data-i="${i}" value="${E(s.title)}" maxlength="80" aria-label="عنوان مرحله">
          <select class="en" data-f="tf" data-i="${i}" aria-label="تایم‌فریم">${TF.map(t => `<option value="${t}" ${t === (s.tf || '') ? 'selected' : ''}>${t || '—'}</option>`).join('')}</select>
          <div class="cxb-move">
            <button type="button" data-cx="up" data-i="${i}" aria-label="بالا" ${i ? '' : 'disabled'}>↑</button>
            <button type="button" data-cx="down" data-i="${i}" aria-label="پایین" ${i < model.steps.length - 1 ? '' : 'disabled'}>↓</button>
            <button type="button" data-cx="del-step" data-i="${i}" aria-label="حذف مرحله">✕</button>
          </div>
        </div>
        <div class="cxb-opts">${s.options.map((o, j) => `<span class="cxb-opt"><input data-f="opt" data-i="${i}" data-j="${j}" value="${E(o.label)}" maxlength="60" placeholder="گزینه" aria-label="گزینه"><button type="button" data-cx="del-opt" data-i="${i}" data-j="${j}" aria-label="حذف گزینه">✕</button></span>`).join('')}<button type="button" class="cxb-add-opt" data-cx="add-opt" data-i="${i}">+ گزینه</button></div>
        <label class="cxb-multi"><input type="checkbox" data-f="multi" data-i="${i}" ${s.multi ? 'checked' : ''}> امکان انتخاب چند گزینه</label>
      </article>`).join('');
  }
  function renderLib() {
    dlg.querySelector('#cxbLib').innerHTML = lib.map(m => `
      <div class="cxb-lib-group"><h3>${E(m.label)}</h3>${m.steps.map((s, k) => `
        <div class="cxb-lib-step"><div><b>${E(s.title)}</b>${s.tf ? `<i class="en">${E(s.tf)}</i>` : ''}<small>${s.options.map(E).join(' · ')}</small></div>
        <button type="button" data-cx="add-lib" data-m="${m.id}" data-k="${k}" aria-label="افزودن مرحله">+</button></div>`).join('')}</div>`).join('');
  }

  function addStep(s) {
    if (model.steps.length >= 25) { toast('حداکثر ۲۵ مرحله'); return false; }
    model.steps.push({ id: rid(), title: s.title, tf: TF.includes(s.tf) ? s.tf : '', multi: !!s.multi, options: s.options.map(l => ({ id: rid(), label: l })) });
    renderSteps(); return true;
  }
  function onClick(e) {
    const b = e.target.closest('[data-cx],[data-cx-tab]'); if (!b) return;
    if (b.dataset.cxTab) { dlg.dataset.tab = b.dataset.cxTab; dlg.querySelectorAll('[data-cx-tab]').forEach(x => x.classList.toggle('on', x === b)); return; }
    const i = +b.dataset.i, st = model.steps[i];
    switch (b.dataset.cx) {
      case 'close': dlg.close(); break;
      case 'blank': if (addStep({ title: 'مرحله‌ی جدید', tf: '1m', multi: false, options: ['✓'] })) { dlg.dataset.tab = 'mine'; dlg.querySelectorAll('[data-cx-tab]').forEach(x => x.classList.toggle('on', x.dataset.cxTab === 'mine')); dlg.querySelector('.cxb-step:last-child .cxb-title')?.select(); } break;
      case 'add-lib': { const m = lib.find(x => x.id === b.dataset.m); if (m && addStep(m.steps[+b.dataset.k])) { b.classList.add('added'); b.textContent = '✓'; setTimeout(() => { b.classList.remove('added'); b.textContent = '+'; }, 900); } break; }
      case 'up': case 'down': { const j = b.dataset.cx === 'up' ? i - 1 : i + 1; if (!model.steps[j]) break; [model.steps[i], model.steps[j]] = [model.steps[j], model.steps[i]]; renderSteps(); break; }
      case 'del-step': model.steps.splice(i, 1); renderSteps(); break;
      case 'add-opt': if (st && st.options.length < 12) { st.options.push({ id: rid(), label: '' }); renderSteps(); dlg.querySelector(`[data-f="opt"][data-i="${i}"][data-j="${st.options.length - 1}"]`)?.focus(); } break;
      case 'del-opt': if (st) { st.options.splice(+b.dataset.j, 1); renderSteps(); } break;
      case 'delete': remove(); break;
      case 'save': save(); break;
    }
  }
  function onInput(e) {
    const t = e.target, i = +t.dataset.i, st = model?.steps[i];
    if (t.id === 'cxbName') { model.name = t.value; return; }
    if (!st) return;
    if (t.dataset.f === 'title') st.title = t.value;
    else if (t.dataset.f === 'tf') st.tf = t.value;
    else if (t.dataset.f === 'multi') st.multi = t.checked;
    else if (t.dataset.f === 'opt') st.options[+t.dataset.j].label = t.value;
  }

  function refreshChecklists() {
    try { renderStandaloneChecklist(); } catch (e) {}
    try { if (!document.getElementById('tradeFormPanel').classList.contains('hidden')) renderFormChecklist(); } catch (e) {}
  }
  async function save() {
    if (typeof requireJournalWrite === 'function' && !requireJournalWrite()) return;
    const name = String(model.name || '').replace(/[<>&"'`]/g, '').trim().slice(0, 40);
    const steps = model.steps.map(s => ({
      id: s.id, title: String(s.title || '').trim().slice(0, 80), tf: TF.includes(s.tf) ? s.tf : '', multi: !!s.multi,
      options: s.options.map(o => ({ id: o.id, label: String(o.label || '').trim().slice(0, 60) })).filter(o => o.label)
    }));
    if (!name) return toast('یک نام برای چک‌لیست بنویس.');
    if (!steps.length) return toast('حداقل یک مرحله اضافه کن.');
    const bad = steps.findIndex(s => !s.title || !s.options.length);
    if (bad > -1) return toast(`مرحله‌ی ${faN(bad + 1)} عنوان یا گزینه ندارد.`);
    const prev = customChecklists.find(x => x.id === model.id);
    if (!prev && customChecklists.length >= 10) return toast('حداکثر ۱۰ چک‌لیست شخصی');
    const entry = { id: model.id, name, version: (Number(prev?.version) || 0) + 1, steps, updatedAt: Date.now() };
    registerCustomChecklists(prev ? customChecklists.map(x => x.id === entry.id ? entry : x) : customChecklists.concat(entry));
    const newId = customSetupId(entry);
    currentSetupId = newId; standaloneChecklistState[newId] = { _model47: newId };
    dlg.close();
    refreshChecklists();
    const ok = await scheduleAutoSync();
    toast(ok ? 'چک‌لیست ذخیره شد ✓' : 'چک‌لیست محلی ذخیره شد؛ ذخیره ابری ناموفق بود');
  }
  async function remove() {
    if (!confirm('این چک‌لیست حذف شود؟ معاملاتی که با آن ثبت شده‌اند دست‌نخورده می‌مانند.')) return;
    if (typeof requireJournalWrite === 'function' && !requireJournalWrite()) return;
    registerCustomChecklists(customChecklists.filter(x => x.id !== model.id));
    const mine = id => String(id).startsWith('cx_' + model.id + '_');
    if (mine(currentSetupId)) currentSetupId = 'cisd48';
    if (mine(formSetupId)) { formSetupId = 'cisd48'; formChecklistState = {}; }
    dlg.close();
    refreshChecklists();
    const ok = await scheduleAutoSync();
    toast(ok ? 'چک‌لیست حذف شد' : 'حذف محلی انجام شد؛ ذخیره ابری ناموفق بود');
  }

  /* "+ build" and "edit" chips next to the entry models */
  function decoratePickers() {
    document.querySelectorAll('.cl-model-picker47 .chips').forEach(chips => {
      if (chips.querySelector('[data-cx-build]')) return;
      const sel = chips.querySelector('.chip.on[data-entry-model^="cx_"]');
      if (sel) chips.insertAdjacentHTML('beforeend', `<button type="button" class="chip cx-chip-edit" data-cx-edit="${E(sel.dataset.entryModel.slice(3).replace(/_\d+$/, ''))}">✎ ویرایش</button>`);
      chips.insertAdjacentHTML('beforeend', '<button type="button" class="chip cx-chip-build" data-cx-build>+ ساخت چک‌لیست من</button>');
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-cx-build],[data-cx-edit]'); if (!b) return;
    e.preventDefault();
    open(b.dataset.cxEdit || null);
  });

  /* =================== Boot =================== */
  function start() {
    initStepper();
    ['standaloneChecklist', 'formChecklist'].forEach(id => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(decoratePickers).observe(el, { childList: true });
    });
    decoratePickers();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();