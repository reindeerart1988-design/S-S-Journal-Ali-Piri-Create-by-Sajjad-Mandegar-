/* S&S Journal — Edition 72: greeting + session status, chart thumbnails */
(() => {
  'use strict';
  console.info('[S&S polish] loaded');
  const fa = n => Number(n).toLocaleString('fa-IR');

  /* ---------- helpers ---------- */
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
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!/^sb-.*-auth-token$/.test(k)) continue;
        const s = JSON.parse(localStorage.getItem(k));
        const u = s && (s.user || (s.currentSession && s.currentSession.user));
        const m = (u && u.user_metadata) || {};
        const n = m.full_name || m.name || m.display_name || '';
        if (n) return String(n).trim().split(/\s+/)[0];
      }
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
    if (!visible(el)) {
      const sub = findText('هر معامله، یک داده');
      if (sub) el = sub;
    }
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

  /* ---------- Chart thumbnails ---------- */
   /* ---------- Chart thumbnails ---------- */
  function linkOf(el) {
    const h = el.getAttribute('href');
    if (h && !/^(#|javascript:)/i.test(h)) return el.href;
    for (const at of el.attributes) {
      const m = at.value.match(/https?:\/\/[^\s'"`)]+/);
      if (m) return m[0];
    }
    // The app opens the link inside its click handler: capture the URL without opening a tab
    let url = '';
    const orig = window.open;
    const fake = { closed: false, focus() {}, close() {}, document: { write() {}, close() {} } };
    window.open = u => { url = String(u || ''); return fake; };
    try { el.click(); } catch (e) {} finally { window.open = orig; }
    return url;
  }
  function imgUrl(href) {
    try {
      const u = new URL(href, location.href);
      if (/\.(png|jpe?g|webp|gif|avif)$/i.test(u.pathname)) return u.href;
      const m = u.hostname.endsWith('tradingview.com') && u.pathname.match(/^\/x\/([A-Za-z0-9]+)\/?$/);
      if (m) return 'https://s3.tradingview.com/snapshots/' + m[1][0].toLowerCase() + '/' + m[1] + '.png';
    } catch (e) {}
    return '';
  }
  function thumbify() {
    document.querySelectorAll('a, button, [role="button"]').forEach(el => {
      if (el.dataset.thumb) return;
      const label = el.textContent.trim();
      if (!/chart/i.test(label) || label.length > 40) return;
      el.dataset.thumb = 'loading';
      const link = linkOf(el), src = imgUrl(link);
      if (!src) { el.dataset.thumb = 'none'; return; }
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async'; img.alt = label;
      img.onload = () => {
        const cap = document.createElement('span');
        cap.textContent = label.replace(/^[^A-Za-z0-9]+/, '');
        el.textContent = '';
        el.dataset.thumb = 'ok';
        el.dataset.link = link;
        el.classList.add('ss-thumb');
        el.append(img, cap);
      };
      img.onerror = () => { el.dataset.thumb = 'fail'; };
      img.src = src;
    });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('.ss-thumb');
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const box = document.createElement('div'); box.className = 'ss-lightbox';
    const im = document.createElement('img'); im.referrerPolicy = 'no-referrer'; im.src = t.querySelector('img').src; im.alt = '';
    const open = document.createElement('a'); open.href = t.dataset.link; open.target = '_blank'; open.rel = 'noopener'; open.textContent = 'باز کردن لینک اصلی ↗';
    box.append(im, open);
    const esc = ev => { if (ev.key === 'Escape') close(); };
    const close = () => { box.classList.remove('on'); document.removeEventListener('keydown', esc); setTimeout(() => box.remove(), 200); };
    box.addEventListener('click', ev => { if (ev.target !== open) close(); });
    document.addEventListener('keydown', esc);
    document.body.append(box);
    requestAnimationFrame(() => box.classList.add('on'));
  }, true);

  /* ---------- Boot ---------- */
  function tick() { try { renderGreeting(); } catch (e) {} try { thumbify(); } catch (e) {} }
  const start = () => { [0, 800, 2500].forEach(t => setTimeout(tick, t)); setInterval(renderGreeting, 30000);
    let q; new MutationObserver(() => { clearTimeout(q); q = setTimeout(tick, 200); })
      .observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();