/* ============================================================
   UI ENHANCE — additive premium layer
   Runs after app.js. Never redefines anything app.js owns; it
   only observes the DOM app.js already renders and layers
   presentation on top (nav pill, command palette, heat map
   intensity, hero number, ambient background).
============================================================ */
(function(){
  'use strict';

  function ready(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    injectBgMesh();
    initNavPill();
    initCommandPalette();
    watchDashboard();
    watchCalendar();
  });

  /* ---------------- Ambient background ---------------- */
  function injectBgMesh(){
    var mesh = document.createElement('div');
    mesh.className = 'bg-mesh';
    document.body.insertBefore(mesh, document.body.firstChild);
  }

  /* ---------------- Sliding nav indicator ---------------- */
  function initNavPill(){
    var nav = document.getElementById('tabs');
    if(!nav) return;
    var pill = document.createElement('div');
    pill.className = 'nav-pill';
    nav.appendChild(pill);

    function place(){
      var active = nav.querySelector('.tab-btn.active');
      if(!active){ pill.classList.remove('on'); return; }
      var navRect = nav.getBoundingClientRect();
      var r = active.getBoundingClientRect();
      pill.style.left = (r.left - navRect.left) + 'px';
      pill.style.width = r.width + 'px';
      pill.style.top = '0';
      pill.style.height = '100%';
      pill.classList.add('on');
    }

    nav.addEventListener('click', function(e){
      if(e.target.closest('.tab-btn')) setTimeout(place, 0);
    });
    window.addEventListener('resize', place);
    // app.js may switch views programmatically; watch class changes too
    var mo = new MutationObserver(function(){ place(); });
    nav.querySelectorAll('.tab-btn').forEach(function(b){
      mo.observe(b, { attributes:true, attributeFilter:['class'] });
    });
    setTimeout(place, 60);
  }

  /* ---------------- Command palette ---------------- */
  function initCommandPalette(){
    var trigger = document.getElementById('cmdkTrigger');
    var tabs = document.querySelectorAll('#tabs .tab-btn');
    if(!tabs.length) return;

    var items = Array.prototype.map.call(tabs, function(btn){
      return {
        label: btn.textContent.trim(),
        icon: btn.querySelector('svg') ? btn.querySelector('svg').outerHTML : '',
        run: function(){ btn.click(); }
      };
    });
    var newTradeBtn = document.getElementById('newTradeBtn');
    if(newTradeBtn){
      items.push({
        label:'ثبت معامله جدید',
        icon:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
        run:function(){
          var journalTab = document.querySelector('#tabs [data-view="journal"]');
          if(journalTab) journalTab.click();
          setTimeout(function(){ newTradeBtn.click(); }, 80);
        }
      });
    }

    var back = document.createElement('div');
    back.className = 'cmdk-back';
    back.innerHTML =
      '<div class="cmdk-box">' +
        '<div class="cmdk-input-row">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="text" class="cmdk-input" placeholder="رفتن به... یا ثبت معامله جدید">' +
        '</div>' +
        '<div class="cmdk-list"></div>' +
      '</div>';
    document.body.appendChild(back);
    var input = back.querySelector('.cmdk-input');
    var list = back.querySelector('.cmdk-list');
    var selIndex = 0, filtered = items;

    function render(){
      var q = input.value.trim();
      filtered = q ? items.filter(function(it){ return it.label.indexOf(q) > -1; }) : items;
      selIndex = 0;
      if(!filtered.length){
        list.innerHTML = '<div class="cmdk-empty">چیزی پیدا نشد</div>';
        return;
      }
      list.innerHTML = filtered.map(function(it, i){
        return '<div class="cmdk-item' + (i===selIndex?' sel':'') + '" data-i="' + i + '">' + it.icon + '<span>' + it.label + '</span></div>';
      }).join('');
    }

    function highlight(){
      list.querySelectorAll('.cmdk-item').forEach(function(el, i){
        el.classList.toggle('sel', i === selIndex);
      });
    }

    function open(){
      back.classList.add('on');
      render();
      input.value = '';
      render();
      setTimeout(function(){ input.focus(); }, 10);
    }
    function close(){ back.classList.remove('on'); }
    function choose(i){
      var it = filtered[i];
      if(!it) return;
      close();
      it.run();
    }

    if(trigger) trigger.addEventListener('click', open);
    document.addEventListener('keydown', function(e){
      var meta = e.metaKey || e.ctrlKey;
      if(meta && e.key.toLowerCase() === 'k'){ e.preventDefault(); open(); }
      else if(e.key === 'Escape' && back.classList.contains('on')){ close(); }
    });
    back.addEventListener('click', function(e){ if(e.target === back) close(); });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown'){ e.preventDefault(); selIndex = Math.min(selIndex+1, filtered.length-1); highlight(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); selIndex = Math.max(selIndex-1, 0); highlight(); }
      else if(e.key === 'Enter'){ e.preventDefault(); choose(selIndex); }
    });
    list.addEventListener('click', function(e){
      var item = e.target.closest('.cmdk-item');
      if(item) choose(Number(item.dataset.i));
    });
  }

  /* ---------------- Dashboard: hero PnL + value pop ---------------- */
  function watchDashboard(){
    var row = document.getElementById('pnlStatsRow');
    if(!row) return;
    var mo = new MutationObserver(function(){ decorate(); });
    mo.observe(row, { childList:true });
    decorate();

    function decorate(){
      var stats = row.querySelectorAll('.pnl-stat');
      if(!stats.length) return;
      var hero = stats[0];
      hero.classList.add('pnl-hero');
      var valEl = hero.querySelector('.val');
      if(valEl && valEl.dataset.pop !== valEl.textContent){
        valEl.dataset.pop = valEl.textContent;
        valEl.classList.remove('val-pop'); void valEl.offsetWidth; valEl.classList.add('val-pop');
      }
    }

    ['statGridPerf','statGridAccount','expGrid','wlGrid'].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      new MutationObserver(function(){
        el.classList.remove('val-pop'); void el.offsetWidth; el.classList.add('val-pop');
      }).observe(el, { childList:true });
    });
  }

  /* ---------------- Calendar heat intensity ---------------- */
  function watchCalendar(){
    var grid = document.getElementById('calGrid');
    if(!grid) return;
    var mo = new MutationObserver(applyIntensity);
    mo.observe(grid, { childList:true });
    applyIntensity();

    function applyIntensity(){
      var cells = grid.querySelectorAll('.cal-cell.pos, .cal-cell.neg');
      if(!cells.length) return;
      var max = 0;
      var values = Array.prototype.map.call(cells, function(cell){
        var plEl = cell.querySelector('.cal-pl');
        if(!plEl) return 0;
        var n = parseFloat(plEl.textContent.replace(/[^0-9.-]/g,''));
        if(isNaN(n)) n = 0;
        max = Math.max(max, Math.abs(n));
        return n;
      });
      cells.forEach(function(cell, i){
        var intensity = max > 0 ? Math.min(1, Math.abs(values[i]) / max) : 0;
        cell.style.setProperty('--intensity', intensity.toFixed(2));
      });
    }
  }
})();
