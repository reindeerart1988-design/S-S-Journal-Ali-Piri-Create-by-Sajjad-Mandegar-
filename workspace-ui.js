/* S&S workspace v68. Presentation only: existing calculation and persistence APIs remain authoritative. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const labels={dashboard:'داشبورد',journal:'ژورنال معاملات',calendar:'تقویم سود و زیان',checklist:'چک‌لیست ورود',roadmap:'نقشه راه',backtest:'بک‌تست',reports:'گزارش‌ها و تحلیل',account:'حساب‌ها',settings:'تنظیمات'};
function open(view){goToView(view);$('moreDialog').close();}
function add(){open('journal');$('newTradeBtn').click();$('tradeFormPanel').scrollIntoView({behavior:'smooth',block:'start'});}
document.querySelectorAll('[data-new-trade]').forEach(b=>b.addEventListener('click',add));
document.querySelectorAll('[data-open-view]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.openView)));
$('workspaceSearch').onclick=()=>$('cmdkTrigger').click();
$('mobileMore').onclick=()=>$('moreDialog').showModal();$('closeMore').onclick=()=>$('moreDialog').close();
$('moreDialog').addEventListener('click',e=>{if(e.target===$('moreDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.querySelectorAll('[data-icon]').forEach(n=>{const icon=document.querySelector(`#tabs [data-view="${n.dataset.icon}"] svg`);if(icon)n.append(icon.cloneNode(true));});
function syncNav(){const active=document.querySelector('#tabs .tab-btn.active')?.dataset.view||'dashboard';$('workspaceTitle').textContent=labels[active]||'S&S Journal';document.querySelectorAll('#tabs .tab-btn').forEach(b=>b.setAttribute('aria-current',b.dataset.view===active?'page':'false'));document.querySelectorAll('.mobile-dock [data-open-view]').forEach(b=>{const on=b.dataset.openView===active;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});$('mobileMore').classList.toggle('active',!['dashboard','journal','checklist'].includes(active));}
new MutationObserver(syncNav).observe($('tabs'),{subtree:true,attributes:true,attributeFilter:['class']});syncNav();
const tone=v=>v<0?'neg':v>0?'pos':'';
const safe=v=>esc(String(v??''));
function render(ann=computeAnnotated()){
 const s=perfStats(ann),gp=ann.filter(a=>a.net>0).reduce((s,a)=>s+a.net,0),gl=-ann.filter(a=>a.net<0).reduce((s,a)=>s+a.net,0);
 const pf=gl? (gp/gl).toFixed(2):gp?'∞':'—';
 const kpis=[['Net P&L','خالص سود و زیان',s.n?fmtUSD(s.net):'—',tone(s.net),`${s.n} معامله در بازه`],['Win Rate','نرخ برد',s.wr===null?'—':s.wr.toFixed(1)+'%','', 'بدون احتساب سربه‌سر'],['Profit Factor','ضریب سود',pf,'','سود خالص ÷ قدر مطلق زیان'],['Average R','میانگین بازده',s.rr===null?'—':(s.rr>=0?'+':'')+s.rr.toFixed(2)+'R',tone(s.rr),'میانگین R هر معامله']];
 $('overviewKpis').innerHTML=kpis.map(([en,fa,v,c,sub])=>`<article class="metric-card"><div class="metric-top"><span>${fa}</span><span class="metric-code en">${en}</span></div><strong class="metric-value en ${c}">${v}</strong><span class="metric-note">${sub}</span></article>`).join('');
 $('reportContext').textContent='بازه گزارش: '+(RANGE_LABELS[pnlRange]||'کل دوره')+' · تغییر بازه از داشبورد';
 renderProgress();renderRecent(ann);renderMiniCalendar();
}
function renderProgress(){
 const a=tradingAccounts.find(a=>a.id===activeTradingAccountId);if(!a){$('dashboardProgress').innerHTML='<h3>وضعیت حساب</h3><div class="empty-state">حسابی انتخاب نشده است.</div>';return;}
 const f=accountFigures(a),target=f.base*Number(a.settings.profitTargetPct||0)/100,pct=target>0?f.net/target*100:0;
 const series=annotateWithBalance(trades);let peak=f.base,maxDD=0;for(const x of series){peak=Math.max(peak,x.after);maxDD=Math.max(maxDD,peak>0?(peak-x.after)/peak*100:0);}
 $('dashboardProgress').innerHTML=`<div class="panel-head"><h3>وضعیت حساب</h3><button type="button" class="text-button" id="progressDetails">جزئیات</button></div><div class="account-name"><span class="account-initial en">${safe((a.name||'S&S').slice(0,2))}</span><div><strong>${safe(a.name)}</strong><small>${safe(a.firm||'حساب معاملاتی')} · ${safe({evaluation:'چالش',funded:'فاندد',personal:'شخصی'}[a.stage]||'حساب')}</small></div></div><div class="progress-balance"><span>موجودی فعلی</span><strong class="en">${fmtUSD(f.balance)}</strong></div>${target>0?`<div class="progress-caption"><span>پیشرفت تا هدف سود</span><bdi>${pct.toFixed(1)}%</bdi></div><progress class="target-progress" max="100" value="${Math.max(0,Math.min(100,pct))}" aria-label="پیشرفت هدف سود"></progress><div class="progress-caption"><span>مانده تا هدف</span><bdi>${fmtUSD(Math.max(0,target-f.net))}</bdi></div>`:'<p class="muted">هدف سود برای این حساب تنظیم نشده.</p>'}<dl class="risk-list"><div><dt>بیشترین افت موجودی بسته‌شده</dt><dd class="en ${maxDD?'neg':''}">${maxDD.toFixed(2)}%</dd></div><div><dt>حد ضرر روزانه تنظیم‌شده</dt><dd class="en">${Number(a.settings.dailyLossPct)>0?Number(a.settings.dailyLossPct)+'%':'—'}</dd></div><div><dt>حد ضرر کل تنظیم‌شده</dt><dd class="en">${Number(a.settings.totalLossPct)>0?Number(a.settings.totalLossPct)+'%':'—'}</dd></div></dl><p class="risk-note">افت موجودی بر اساس معاملات ثبت‌شده است؛ اکوئیتی زنده و معاملات باز را شامل نمی‌شود.</p>`;
 $('progressDetails').onclick=()=>open('account');
}
function renderRecent(ann){
 const rows=[...ann].reverse().slice(0,5);
 $('dashboardRecent').innerHTML=rows.length?`<div class="recent-table-wrap"><table class="recent-table"><thead><tr><th>نماد / جهت</th><th>تاریخ</th><th>نتیجه</th><th>خالص P&L</th><th>R</th></tr></thead><tbody>${rows.map(a=>`<tr><td><button type="button" class="trade-link" data-trade-id="${safe(a.t.id)}"><bdi>${safe(a.t.symbol||'NQ')}</bdi><small>${a.t.direction==='buy'?'Buy':'Sell'}</small></button></td><td><bdi>${safe(a.t.date)}</bdi></td><td><span class="result-label ${tone(a.net)}">${a.eff==='win'?'Win':a.eff==='loss'?'Loss':'BE'}</span></td><td class="${tone(a.net)}"><bdi>${fmtUSD(a.net)}</bdi></td><td><bdi>${fmtR(a.t.rr)}</bdi></td></tr>`).join('')}</tbody></table></div>`:'<div class="workspace-empty"><span class="empty-symbol" aria-hidden="true">＋</span><h4>اولین معامله، شروع یک تصویر روشن</h4><p>معاملات این بازه پس از ثبت، اینجا نمایش داده می‌شوند.</p><button type="button" class="btn" id="emptyAdd">ثبت اولین معامله</button></div>';
 $('emptyAdd')?.addEventListener('click',add);
 $('dashboardRecent').querySelectorAll('[data-trade-id]').forEach(b=>b.onclick=()=>{open('journal');const filters=['filterKillzone','filterDirection','filterResult'];filters.forEach(id=>{if($(id))$(id).value='';});renderTradesList();const card=$('card-'+b.dataset.tradeId);if(card){toggleTradeCard(b.dataset.tradeId);card.scrollIntoView({behavior:'smooth',block:'center'});}});
}
function renderMiniCalendar(){
 const now=todayNY(),y=Number(now.slice(0,4)),m=Number(now.slice(5,7))-1,days=new Date(Date.UTC(y,m+1,0)).getUTCDate(),lead=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7;
 let cells='<span class="blank" aria-hidden="true"></span>'.repeat(lead);
 for(let day=1;day<=days;day++){const date=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,rows=trades.filter(t=>t.date===date),net=rows.reduce((s,t)=>s+calcNet(t),0);cells+=`<button type="button" data-cal-date="${date}" class="${rows.length?tone(net):''} ${date===now?'today':''}" aria-label="${date}، ${rows.length} معامله، ${fmtUSD(net)}"><span>${day}</span>${rows.length?`<small>${net>=0?'+':''}${fmtCompact(net)}</small>`:''}</button>`;}
 $('dashboardCalendar').innerHTML=`<div class="mini-month en">${MONTHS_EN[m]} ${y}</div><div class="mini-week en">${['M','T','W','T','F','S','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="mini-calendar en">${cells}</div><p class="calendar-note">ماه جاری · سود و زیان خالص</p>`;
 $('dashboardCalendar').querySelectorAll('[data-cal-date]').forEach(b=>b.onclick=()=>{calState.year=y;calState.month=m;calState.view='month';renderCalendar();open('calendar');});
}
window.addEventListener('ss:dashboard',e=>render(e.detail.ann));render();
})();
