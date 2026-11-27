/* S&S Journal — Edition 74: day groups, toasts, loading skeleton, achievements */
(() => {
  'use strict';
  const fa = n => Number(n).toLocaleString('fa-IR');
  const usd = v => (typeof fmtUSD === 'function' ? fmtUSD(v) : '$' + Number(v).toFixed(2));

  /* ---------- Loading skeleton (while data is fetched from the server) ---------- */
  if (typeof window.setSyncStatus === 'function') {
    const orig = window.setSyncStatus;
    window.setSyncStatus = function (text) {
      const loading = /در حال دریافت/.test(String(text || ''));
      document.documentElement.classList.toggle('ss-loading', loading);
      if (loading) setTimeout(() => document.documentElement.classList.remove('ss-loading'), 15000);
      return orig.apply(this, arguments);
    };
  }

  /* ---------- Trade list: day separators ---------- */
  function groupDays() {
    const wrap = document.getElementById('tradesList');
    if (!wrap || wrap.querySelector('.trade-day') || typeof trades === 'undefined') return;
    const days = new Map();
    wrap.querySelectorAll(':scope > .trade-card').forEach(card => {
      const t = trades.find(x => 'card-' + x.id === card.id); if (!t) return;
      const d = t.date || '';
      if (!days.has(d)) days.set(d, { first: card, n: 0, net: 0 });
      const x = days.get(d); x.n++; x.net += typeof calcNet === 'function' ? calcNet(t) : 0;
    });
    days.forEach((x, d) => {
      const el = document.createElement('div');
      el.className = 'trade-day';
      el.innerHTML = '<span class="trade-day-date en"></span><span class="trade-day-count"></span><span class="trade-day-net en"></span>';
      el.children[0].textContent = d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
      el.children[1].textContent = fa(x.n) + ' معامله';
      el.children[2].textContent = (x.net > 0 ? '+' : '') + usd(x.net);
      el.children[2].classList.add(x.net >= 0 ? 'pos' : 'neg');
      x.first.before(el);
    });
  }

  /* ---------- Toasts: success / error / info ---------- */
  function watchToast() {
    const t = document.getElementById('toast'); if (!t) return;
    let skip = false;
    const classify = () => {
      if (skip) { skip = false; return; }
      const s = t.textContent || '';
      t.dataset.kind = /ناموفق|خطا|نشد|نامعتبر|مسدود|سازگار نیست|ممکن نیست/.test(s) ? 'err'
        : /✓|ذخیره شد|حذف شد|اضافه شد|ساخته شد|دانلود شد|جایگزین شد|پاک شد|به‌روزرسانی شد/.test(s) ? 'ok' : 'info';
      if (s.includes('✓')) { skip = true; t.textContent = s.replace(/\s*✓\s*/g, ' ').trim(); }
    };
    new MutationObserver(classify).observe(t, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- Achievements ---------- */
  const ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z"/></svg>';
  const newestFirst = () => (typeof trades === 'undefined' ? [] : (typeof chronological === 'function' ? chronological(trades) : trades.slice()).reverse());
  const streak = (list, fn) => { let n = 0; for (const t of list) { if (fn(t) === true) n++; else break; } return n; };
  function checklistComplete(t) {
    try {
      const st = { ...(t.checklist || {}) };
      const steps = modelSteps47(t.setupId, st);
      return steps && steps.length ? stepsDoneCount(steps, st) === steps.length : null;
    } catch (e) { return null; }
  }
  function weekStart() {
    const d = typeof todayNY === 'function' ? todayNY() : new Date().toISOString().slice(0, 10);
    const dt = new Date(d + 'T12:00:00Z'); dt.setUTCDate(dt.getUTCDate() - (dt.getUTCDay() + 6) % 7);
    return dt.toISOString().slice(0, 10);
  }
  let lastBadges = null;
  function renderBadges() {
    const greet = document.getElementById('ssGreeting'); if (!greet || typeof calcNet !== 'function') return;
    let host = document.getElementById('ssBadges');
    if (!host) { host = document.createElement('div'); host.id = 'ssBadges'; host.className = 'ss-badges'; greet.after(host); lastBadges = null; }
    const list = newestFirst(), out = [];

    const cl = streak(list, checklistComplete);
    if (cl >= 3) out.push(fa(cl) + ' معامله‌ی پشت‌سرهم با چک‌لیست کامل');
    const wins = streak(list, t => t.result === 'win');
    if (wins >= 3) out.push(fa(wins) + ' برد پشت‌سرهم');
    const ws = weekStart(), week = list.filter(t => (t.date || '') >= ws);
    if (week.length >= 2 && week.reduce((s, t) => s + calcNet(t), 0) > 0) out.push('این هفته سودده بوده');
    const lim = typeof settings !== 'undefined' && Number(settings.dailyLossPct) > 0 ? Number(settings.initialBalance) * Number(settings.dailyLossPct) / 100 : 0;
    if (lim) {
      const byDay = new Map(); list.forEach(t => byDay.set(t.date, (byDay.get(t.date) || 0) + calcNet(t)));
      let safe = 0; for (const v of byDay.values()) { if (-v < lim) safe++; else break; }
      if (safe >= 5) out.push(fa(safe) + ' روز معاملاتی بدون نقض حد روزانه');
    }
    const jr = streak(list, t => !!(t.entryReason && t.entryReason.trim()));
    if (jr >= 5) out.push(fa(jr) + ' معامله‌ی اخیر با دلیل ورود ثبت‌شده');

    const html = out.slice(0, 4).map(t => `<span class="ss-badge">${ICON}<b>${t}</b></span>`).join('');
    if (html !== lastBadges) { lastBadges = html; host.innerHTML = html; }
    host.hidden = !out.length;
  }

  /* ---------- Boot ---------- */
  function start() {
    const wrap = document.getElementById('tradesList');
    if (wrap) { new MutationObserver(groupDays).observe(wrap, { childList: true }); groupDays(); }
    watchToast();
    const run = () => { try { renderBadges(); } catch (e) {} };
    [1000, 2800].forEach(t => setTimeout(run, t));
    window.addEventListener('ss:dashboard', () => setTimeout(run, 50));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();