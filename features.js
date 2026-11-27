/* S&S Journal — Edition 76: trade-form stepper */
(() => {
  'use strict';
  const faN = n => Number(n).toLocaleString('fa-IR');

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

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initStepper) : initStepper();
})();