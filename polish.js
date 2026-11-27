/* S&S Journal — Edition 73: greeting + live session, prop-firm rule cards */
(() => {
  'use strict';
  const fa = n => Number(n).toLocaleString('fa-IR');
  const usd = v => (typeof fmtUSD === 'function' ? fmtUSD(v) : '$' + Number(v).toFixed(2));
  const pctTxt = v => (Math.round(Number(v) * 100) / 100) + '%';
  const safe = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[<>&"']/g, ''));

  function findText(phrase) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) if (n.nodeValue.includes(phrase)) return n.parentElement;
    return null;
  }
  const visible = el => el && el.getClientRects().length > 0;

  /* ---------- Greeting ---------- */
  function userName() {
    try {
      const u = typeof currentUser !== 'undefined' ? currentUser : null;
      const n = u && u.user_metadata && u.user_metadata.full_name;
      if (n) return String(n).trim().split(/\s+/)[0];
    } catch (e) {}
    return '';
  }
  function hello() {
    const h = new Date().getHours();
    return h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 16 ? 'ظهر بخیر' : h < 20 ? 'عصر بخیر' : 'شب بخیر';
  }
  function nyNow() {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return { day: g('weekday'), min: (+g('hour') % 24) * 60 + +g('minute') };
  }
  const SESS = [{ n: 'NY AM', s: 570, e: 660 }, { n: 'NY PM', s: 660, e: 960 }];
  const dur = m => { const h = Math.floor(m / 60), r = m % 60; return !h ? fa(r) + ' دقیقه' : !r ? fa(h) + ' ساعت' : fa(h) + ' ساعت و ' + fa(r) + ' دقیقه'; };
  function status() {
    const { day, min } = nyNow();
    if (day === 'Sat' || day === 'Sun') return { live: false, s: '', t: 'بازار تعطیله؛ وقت خوبیه برای مرور ژورنال' };
    for (const x of SESS) if (min >= x.s && min < x.e) return { live: true, s: x.n, t: 'فعاله · ' + dur(x.e - min) + ' تا پایان' };
    const next = SESS.find(x => min < x.s);
    return next ? { live: false, s: next.n, t: dur(next.s - min) + ' دیگه شروع می‌شه' }
                : { live: false, s: '', t: 'سشن‌های امروز تموم شد؛ وقت مرور معاملات' };
  }
  function anchorPoint() {
    let el = findText('تصویر روشن عملکرد');
    if (el) el = el.closest('h1,h2,h3,[class*="title"]') || el;
    if (!visible(el)) { const sub = findText('هر معامله، یک داده'); if (sub) el = sub; }
    return el;
  }
  function renderGreeting() {
    let el = document.getElementById('ssGreeting');
    if (!el || !document.body.contains(el)) {
      const at = anchorPoint();
      if (!at) return;
      el = document.createElement('div');
      el.id = 'ssGreeting'; el.className = 'ss-greet';
      el.innerHTML = '<span class="ss-greet-hi"></span><span class="ss-greet-st"><i></i><bdi class="ss-sess"></bdi><b></b></span>';
      at.parentNode.insertBefore(el, at);
    }
    const name = userName(), st = status();
    el.querySelector('.ss-greet-hi').textContent = hello() + (name ? '، ' + name : '');
    el.querySelector('.ss-sess').textContent = st.s;
    el.querySelector('.ss-greet-st b').textContent = st.t;
    el.classList.toggle('is-live', st.live);
  }

  /* ---------- Prop-firm rules ---------- */
  const STAGES = { evaluation: 'چالش', funded: 'فاندد', personal: 'شخصی' };
  const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);

  function propData() {
    if (typeof trades === 'undefined' || typeof settings === 'undefined' || typeof calcNet !== 'function') return null;
    const list = typeof chronological === 'function' ? chronological(trades) : trades.slice();
    const base = Number(settings.initialBalance) || 0;
    const byDay = new Map();
    let bal = base, low = base, profit = 0;
    list.forEach(t => {
      const n = calcNet(t);
      profit += n; bal += n; low = Math.min(low, bal);
      if (t.date) byDay.set(t.date, (byDay.get(t.date) || 0) + n);
    });
    const today = typeof todayNY === 'function' ? todayNY() : '';
    return {
      acc: typeof activeTradingAccount === 'function' ? activeTradingAccount() : null,
      base, profit,
      worstDay: Math.max(0, ...[...byDay.values()].map(v => -v)),
      todayLoss: Math.max(0, -(byDay.get(today) || 0)),
      totalDD: Math.max(0, base - low),
      curDD: Math.max(0, -profit),
      days: byDay.size,
      targetPct: num(settings.profitTargetPct), dailyPct: num(settings.dailyLossPct),
      totalPct: num(settings.totalLossPct), minDays: num(settings.minTradingDays)
    };
  }
  const badge = (cls, t) => `<span class="prop-badge ${cls}">${t}</span>`;
  const level = u => u >= 1 ? 'bad' : u >= 0.7 ? 'warn' : 'ok';
  const levelText = u => u >= 1 ? 'نقض شده' : u >= 0.7 ? 'نزدیک حد' : 'پایدار';
  const bar = (cls, r) => `<div class="prop-bar ${cls}"><i style="width:${(Math.max(0, Math.min(1, r)) * 100).toFixed(1)}%"></i></div>`;
  const unset = title => `<article class="prop-card unset"><header><h3>${title}</h3>${badge('', 'تنظیم نشده')}</header><p>این قانون در تنظیمات حساب مشخص نشده است.</p><button type="button" class="prop-set" data-prop-go>تنظیم در حساب</button></article>`;

  function cardTarget(d) {
    if (!d.targetPct) return unset('هدف سود');
    const target = d.base * d.targetPct / 100, done = d.profit >= target;
    return `<article class="prop-card${done ? ' is-done' : ''}">
      <header><h3>هدف سود</h3>${badge(done ? 'ok' : 'gold', done ? 'تکمیل شده' : 'تکمیل نشده')}</header>
      <div class="prop-big ${d.profit < 0 ? 'neg' : 'pos'}">${usd(d.profit)}</div>
      <div class="prop-sub"><span>هدف: <bdi class="en">${usd(target)}</bdi> · <bdi class="en">${pctTxt(d.targetPct)}</bdi></span><bdi class="en">${d.base ? (d.profit / d.base * 100).toFixed(2) + '%' : '—'}</bdi></div>
      ${bar('gold', target ? d.profit / target : 0)}
      <div class="prop-foot"><span>مانده تا هدف</span><b class="en">${usd(Math.max(0, target - d.profit))}</b></div>
    </article>`;
  }
  function cardDaily(d) {
    if (!d.dailyPct) return unset('بیشترین افت روزانه');
    const limit = d.base * d.dailyPct / 100, u = limit ? d.worstDay / limit : 0;
    return `<article class="prop-card">
      <header><h3>بیشترین افت روزانه</h3>${badge(level(u), levelText(u))}</header>
      <div class="prop-big ${d.worstDay > 0 ? 'neg' : ''}">${usd(-d.worstDay)}</div>
      <div class="prop-sub"><span>حد مجاز: <bdi class="en">${usd(limit)}</bdi> · <bdi class="en">${pctTxt(d.dailyPct)}</bdi></span><bdi class="en">${(u * 100).toFixed(0)}%</bdi></div>
      ${bar(level(u), u)}
      <div class="prop-foot"><span>افت امروز</span><b class="en">${usd(-d.todayLoss)}</b></div>
    </article>`;
  }
  function cardTotal(d) {
    if (!d.totalPct) return unset('بیشترین افت کلی');
    const limit = d.base * d.totalPct / 100, u = limit ? d.totalDD / limit : 0;
    return `<article class="prop-card">
      <header><h3>بیشترین افت کلی</h3>${badge(level(u), levelText(u))}</header>
      <div class="prop-big ${d.totalDD > 0 ? 'neg' : ''}">${usd(-d.totalDD)}</div>
      <div class="prop-sub"><span>حد مجاز: <bdi class="en">${usd(limit)}</bdi> · <bdi class="en">${pctTxt(d.totalPct)}</bdi></span><bdi class="en">${(u * 100).toFixed(0)}%</bdi></div>
      ${bar(level(u), u)}
      <div class="prop-foot"><span>فاصله‌ی فعلی تا حد</span><b class="en">${usd(Math.max(0, limit - d.curDD))}</b></div>
    </article>`;
  }
  function cardDays(d) {
    const need = d.minDays, done = need ? d.days >= need : false;
    let meter = '';
    if (need && need <= 20) meter = `<div class="prop-days">${Array.from({ length: need }, (_, i) => `<i class="${i < d.days ? 'on' : ''}"></i>`).join('')}</div>`;
    else if (need) meter = bar('gold', d.days / need);
    return `<article class="prop-card">
      <header><h3>حداقل روزهای معاملاتی</h3>${need ? badge(done ? 'ok' : 'gold', done ? 'تکمیل شده' : 'در جریان') : badge('', 'تنظیم نشده')}</header>
      <div class="prop-big">${d.days}<small> روز</small></div>
      <div class="prop-sub"><span>${need ? 'حداقل لازم: <bdi class="en">' + need + '</bdi> روز' : 'حداقل روز در تنظیمات حساب مشخص نشده'}</span></div>
      ${meter}
      ${need ? '' : '<button type="button" class="prop-set" data-prop-go>تنظیم در حساب</button>'}
    </article>`;
  }

  let lastProp = '';
  function propHost() {
    let host = document.getElementById('propRules');
    if (host && document.body.contains(host)) return host;
    const pnl = document.querySelector('.pnl-panel');
    if (!pnl) return null;
    let anchor = pnl;
    while (anchor.parentElement && anchor.parentElement.id !== 'view-dashboard' && anchor.parentElement !== document.body) anchor = anchor.parentElement;
    if (anchor.parentElement === document.body) anchor = pnl;
    host = document.createElement('section');
    host.id = 'propRules'; host.className = 'prop-rules';
    anchor.parentNode.insertBefore(host, anchor);
    lastProp = '';
    return host;
  }
  function renderProp() {
    syncMinDaysField();
    const d = propData(); if (!d) return;
    const host = propHost(); if (!host) return;
    const any = d.targetPct || d.dailyPct || d.totalPct || d.minDays;
    if (!any && (!d.acc || d.acc.stage === 'personal')) { host.hidden = true; return; }
    host.hidden = false;
    const sub = d.acc ? [d.acc.name, d.acc.firm, STAGES[d.acc.stage]].filter(Boolean).map(safe).join(' · ') : '';
    const html = `<div class="prop-head"><h2>قوانین حساب</h2><span>${sub}</span></div><div class="prop-grid">${cardTarget(d)}${cardDaily(d)}${cardTotal(d)}${cardDays(d)}</div>`;
    if (html === lastProp) return;
    lastProp = html; host.innerHTML = html;
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-prop-go]') && typeof goToView === 'function') goToView('account');
  });

  /* New account setting: minimum trading days (stored with the account's settings) */
  function syncMinDaysField() {
    const f = document.getElementById('acc-minDays');
    if (f && document.activeElement !== f && typeof settings !== 'undefined') f.value = settings.minTradingDays ?? '';
  }
  function injectMinDays() {
    if (document.getElementById('acc-minDays')) return;
    const ref = document.getElementById('acc-totalLoss'); if (!ref) return;
    const box = ref.closest('.field') || ref.parentElement;
    const clone = box.cloneNode(true);
    const input = clone.querySelector('input'); if (!input) return;
    input.id = 'acc-minDays'; input.removeAttribute('name'); input.removeAttribute('max');
    input.value = ''; input.min = '0'; input.step = '1'; input.placeholder = 'مثلاً 3';
    const lbl = clone.querySelector('label');
    if (lbl) {
      if (lbl.contains(input)) {
        const tn = [...lbl.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
        if (tn) tn.nodeValue = 'حداقل روزهای معاملاتی ';
      } else { lbl.textContent = 'حداقل روزهای معاملاتی'; lbl.htmlFor = 'acc-minDays'; }
    }
    box.after(clone);
    syncMinDaysField();
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#saveSettingsBtn') || typeof settings === 'undefined') return;
    const f = document.getElementById('acc-minDays'); if (!f) return;
    const v = f.value.trim();
    settings.minTradingDays = v === '' ? null : Math.max(0, Math.floor(Number(v)) || 0);
  }, true);

  /* ---------- Boot ---------- */
  function start() {
    injectMinDays();
    const run = () => { try { renderGreeting(); } catch (e) {} try { renderProp(); } catch (e) {} };
    [0, 800, 2500].forEach(t => setTimeout(run, t));
    setInterval(() => { try { renderGreeting(); } catch (e) {} }, 30000);
    window.addEventListener('ss:dashboard', () => { try { renderProp(); } catch (e) {} });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();