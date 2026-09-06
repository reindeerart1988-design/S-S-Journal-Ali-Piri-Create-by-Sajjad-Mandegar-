// ==========================================
// تنظیمات اتصال به Supabase
// ==========================================
const SUPABASE_URL = "https://iazjcnpnybywhorfigvq.supabase.co";
const SUPABASE_KEY = "sb_publishable_QLI3Adqlm-tk__4sUD8I1w_7GzJ8NPT";
const supabaseClient = window.supabase ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let currentUser = null;

// بررسی وضعیت ورود به محض لود شدن صفحه
window.addEventListener('DOMContentLoaded', async () => {
  if (supabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      currentUser = user;
      const modal = document.getElementById('auth-modal');
      if (modal) modal.style.display = 'none';
      if (typeof loadUserTrades === 'function') loadUserTrades();
    }
  }
  
  // بارگذاری initial داده‌ها
  trades = loadTrades();
  settings = loadSettings();
  applyTheme(loadTheme());
  populateAccountFields();
  refreshAll();
  startKzTicker();
});

// تابع ثبت‌نام کاربر جدید
async function handleSignUp() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  if(!email || !password) return alert("لطفاً ایمیل و رمز عبور را وارد کنید.");
  
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) alert("خطا در ثبت‌نام: " + error.message);
  else alert("ثبت‌نام موفقیت‌آمیز بود! اکنون می‌توانید وارد شوید.");
}

// تابع ورود به حساب
async function handleLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  if(!email || !password) return alert("لطفاً ایمیل و رمز عبور را وارد کنید.");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    alert("خطا در ورود: " + error.message);
  } else {
    currentUser = data.user;
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
    if (typeof loadUserTrades === 'function') loadUserTrades();
  }
}

// تابع خروج از حساب
async function handleLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  location.reload();
}

/* ============================================================
   DATA & SETUP CONFIGURATIONS
============================================================ */
const STEP_POI = { 
  n:'1', title:'Liquidity / POI', tf:'15m',
  items:[ {key:'bsl',label:'BSL',en:true}, {key:'ssl',label:'SSL',en:true}, {key:'fvg',label:'FVG',en:true}, {key:'ob',label:'Order Block',en:true} ],
  help:'یک نقطهٔ نقدینگی (POI) روی تایم‌فریم ۱۵ دقیقه پیدا کن: یک <b>BSL</b> یا <b>SSL</b> گرفته‌نشده، یا یک <b>FVG</b>/<b>Order Block</b> که قیمت به آن واکنش نشان می‌دهد.',
  helpAlways:true 
};

const STEP_CRT_BOX = { 
  n:'2', title:'CRT / BOX', tf:'15m',
  items:[ {key:'crt',label:'CRT',en:true}, {key:'box',label:'BOX',en:true} ],
  note:'فقط تا ۲ کندل بعد از C1 اجازهٔ ورود داریم؛ یعنی فقط C2 و C3. بعد از C3 دیگر ورود مجاز نیست.',
  condNotes:[
    {when:'crt', text:'C1: کندلی که CRT را تشکیل داده (کندل اول)'},
    {when:'box', text:'C1: کندلی که به داخل رنج کندل اول برگشته و با بدنه بالای SSL یا پایین BSL کلوز داده'}
  ] 
};

const STEP_CONFIRMATION = { 
  n:'3', title:'Confirmation', tf:'1m',
  items:[ {key:'cisd',label:'CISD',en:true}, {key:'mss',label:'MSS',en:true} ],
  help:'<b>CISD</b> یا <b>MSS</b> روی تایم‌فریم ۱ دقیقه یعنی شکست ساختار قیمت بعد از گرفتن لیکوییدیتی.' 
};

const STEP_BREAK_OB = { 
  n:'break', title:'Break OB', tf:'1m',
  items:[ {key:'breakob',label:'✓'} ] 
};

const SETUPS = {
  standard: {
    id:'standard', label:'استاندارد (۵۰٪)', tag:'STD', accent:'blue',
    desc:'برگشت قیمت به ۵۰٪ همان Order Block بعد از تأیید CISD/MSS.',
    steps:[
      STEP_POI, STEP_CRT_BOX, STEP_CONFIRMATION,
      { n:'4', title:'نقطهٔ ورود: ۵۰٪', tf:'1m',
        items:[ {key:'ob50',label:'رسیدن به ۵۰٪ OB'} ],
        help:'بعد از <b>CISD/MSS</b> صبر می‌کنیم قیمت به ۵۰٪ همان <b>Order Block</b> برگردد.' },
      { n:'5', title:'Stop Run (SR)', tf:'1m', type:'conditional',
        followKey:'followThrough', condKey:'sr', followLabel:'Follow Through', condLabel:'SR',
        note:'اگر بعد از CISD/MSS سه کندل کلوز بدهد، منتظر Follow Through (FT) باشیم.' },
      { ...STEP_BREAK_OB, n:'6' }
    ]
  },
  breaker: {
    id:'breaker', label:'بریکر بلاک', tag:'BB', accent:'amber',
    desc:'ورود با شکست Breaker Block پشت CISD/MSS، بدون نیاز به رسیدن قیمت به ۵۰٪.',
    steps:[
      STEP_POI, STEP_CRT_BOX, STEP_CONFIRMATION,
      { n:'4', title:'Breaker Block پشت CISD/MSS', tf:'1m',
        items:[ {key:'bb_cisd',label:'BB شناسایی شد',en:true} ],
        help:'دنبال یک <b>Breaker Block</b> قبل از CISD/MSS می‌گردیم.' },
      { ...STEP_BREAK_OB, n:'5' }
    ]
  },
  aggressive: {
    id:'aggressive', label:'ورود تهاجمی', tag:'AGG', accent:'red',
    desc:'ورود زودهنگام در ۱ دقیقه با تأیید مومنتوم و iFVG، قبل از کلوز کندل ۱۵ دقیقه.',
    steps:[
      { ...STEP_POI, help:'یک ناحیهٔ نقدینگی (<b>BSL</b> یا <b>SSL</b>) که هدف حرکت است.' },
      { n:'2', title:'تشخیص مومنتوم لگ', tf:'15m',
        items:[
          {key:'leg_strong', label:'لگ قوی و بدون Pullback زیاد'},
          {key:'leg_fvg', label:'FVG',en:true},
          {key:'m15_cisd', label:'ساختار 15M / CISD',en:true}
        ],
        multi:true,
        help:'سه نشانه باید تأیید شوند: <b>۱)</b> قدرت لگ، <b>۲)</b> وجود FVG، <b>۳)</b> ساختار CISD.',
        helpAlways:true },
      { n:'3', title:'iFVG قبل از CISD/MSS', tf:'1m',
        items:[ {key:'ifvg', label:'iFVG وجود دارد',en:true} ],
        note:'⚠ الزامی: اگر قبل از CISD/MSS یک iFVG وجود نداشته باشد، این ستاپ کنسل است.',
        help:'ورود روی کندل ۱۵ دقیقه‌ای کلوز نداده در ۱ دقیقه.' },
      { ...STEP_CONFIRMATION, n:'4' },
      { ...STEP_BREAK_OB, n:'5' }
    ]
  }
};
const SETUP_ORDER = ['standard','breaker','aggressive'];
function getSetup(id){ return SETUPS[id] || SETUPS.standard; }

function stepDone(step, state){
  state = state || {};
  if(step.skipIfKey && state[step.skipIfKey]) return true;
  if(step.type==='conditional'){
    if(!state[step.followKey]) return true;
    return !!state[step.condKey];
  }
  if(step.multi) return step.items.every(it=>!!state[it.key]);
  return step.items.some(it=>!!state[it.key]);
}
function stepsDoneCount(steps, state){ return steps.filter(s=>stepDone(s,state)).length; }

const KILLZONES = [
  { label:'NY Session', h1:8, m1:30, h2:15, m2:30 },
  { label:'London',     h1:2, m1:0,  h2:5,  m2:0 }
];
const NY_TZ = 'America/New_York';
const KZ_OPTIONS = ['NY Session','London','Out of Killzone'];
const SYMBOL = 'NQ';

const ICONS = { chevron:'<path d="m6 9 6 6 6-6"/>' };

/* ============================================================
   STORAGE & UTILS
============================================================ */
const DEFAULT_SETTINGS = { initialBalance:10000, commissionPerLot:5, gdClientId:'', gdAuto:false };
const SCHEMA_VERSION = 4;

const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>ESC_MAP[c]); }
function safeUrl(u){ u = String(u==null?'':u).trim(); return /^https?:\/\//i.test(u) ? u : ''; }

function flagStorageProblem(msg){
  const b = document.getElementById('storageWarn');
  if(!b) return;
  if(msg){ document.getElementById('storageWarnText').textContent = msg; b.classList.add('on'); }
  else b.classList.remove('on');
}

function loadTrades(){
  try{
    const v=localStorage.getItem('ss:trades');
    return v? JSON.parse(v).map(migrateTrade) : [];
  }catch(e){ return []; }
}
function saveTrades(list){
  try{ localStorage.setItem('ss:trades', JSON.stringify(list)); flagStorageProblem(''); return true; }
  catch(e){
    flagStorageProblem('حافظهٔ مرورگر پر است. خروجی JSON بگیرید.');
    return false;
  }
}
function loadSettings(){
  try{ const v=localStorage.getItem('ss:settings'); return Object.assign({}, DEFAULT_SETTINGS, v?JSON.parse(v):{}); }
  catch(e){ return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(s){
  try{ localStorage.setItem('ss:settings', JSON.stringify(s)); flagStorageProblem(''); return true; }
  catch(e){ flagStorageProblem('ذخیرهٔ تنظیمات ممکن نشد.'); return false; }
}
function loadTheme(){ try{ return localStorage.getItem('ss:theme') || 'dark'; }catch(e){ return 'dark'; } }
function saveTheme(t){ try{ localStorage.setItem('ss:theme', t); }catch(e){} }
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('#themeSwitch button').forEach(b=> b.classList.toggle('on', b.dataset.theme===t));
  saveTheme(t);
}

document.querySelectorAll('#themeSwitch button').forEach(b=>{
  b.addEventListener('click', ()=> applyTheme(b.dataset.theme));
});

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(showToast._tm);
  showToast._tm=setTimeout(()=>t.classList.remove('show'),2200);
}
function uid(){ return 't'+Date.now()+Math.random().toString(36).slice(2,7); }
function fmtUSD(v){ v=Number(v)||0; return (v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:2}); }
function fmtR(v){ v=Number(v)||0; if(Math.abs(v)<0.05) return '0R'; return (v>0?'+':'')+v.toFixed(1)+'R'; }

function todayNY(){ const p = tzInfo(new Date(), NY_TZ); return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`; }
function shiftISO(iso, days, months){
  const d = new Date(iso+'T00:00:00');
  if(days) d.setDate(d.getDate()+days);
  if(months) d.setMonth(d.getMonth()+months);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

/* ============================================================
   STATE & DATA MIGRATION
============================================================ */
let trades = [];
let settings = { initialBalance:10000, commissionPerLot:5 };
let editingTradeId = null;
let standaloneChecklistState = { standard:{}, breaker:{}, aggressive:{} };
let formChecklistState = {};

let tradesByDate = new Map();
function rebuildIndex(){
  tradesByDate = new Map();
  for(const t of trades){
    const k = t.date || '';
    if(!tradesByDate.has(k)) tradesByDate.set(k, []);
    tradesByDate.get(k).push(t);
  }
}
function commitTrades(){ rebuildIndex(); return saveTrades(trades); }
function refreshAll(){ populateFilters(); renderTradesList(); renderDashboard(); renderCalendar(); }

function calcCommission(t){ return (Number(t.lotSize)||0) * (Number(settings.commissionPerLot)||0); }
function calcNet(t){ return (Number(t.grossPL)||0) - calcCommission(t); }
function calcBalance(){ return (Number(settings.initialBalance)||0) + trades.reduce((s,t)=>s+calcNet(t),0); }

function migrateTrade(t){
  const m = { ...t };
  const v = Number(m.v) || 0;
  m.symbol = SYMBOL;
  if(!m.id) m.id = uid();
  if(!m.result) m.result = Number(m.rr)>0 ? 'win' : (Number(m.rr)<0 ? 'loss' : 'be');
  m.rr = Number(m.rr)||0;
  if(v < SCHEMA_VERSION && m.result==='loss' && m.rr >= 0) m.rr = -1;
  if(m.result==='win')  m.rr = Math.abs(m.rr);
  if(m.result==='loss') m.rr = -Math.abs(m.rr) || -1;
  if(m.result==='be')   m.rr = 0;
  m.v = SCHEMA_VERSION;
  if(!m.createdAt) m.createdAt = Date.parse((m.date||'1970-01-01')+'T12:00:00') || 0;
  if(m.killzone==='NY AM' || m.killzone==='NY PM') m.killzone = 'NY Session';
  if(!KZ_OPTIONS.includes(m.killzone)) m.killzone = 'Out of Killzone';
  if(!m.trend) m.trend = m.direction==='sell' ? 'bearish' : 'bullish';
  if(!m.setupId || !SETUPS[m.setupId]) m.setupId = 'standard';
  const c = m.checklist || {};
  m.checklist = {
    bsl: !!(c.bsl || c.bsl_sweep), ssl: !!(c.ssl || c.ssl_sweep),
    fvg: !!(c.fvg || c.fvg_hit), ob: !!(c.ob || c.ob_hit),
    crt: !!(c.crt || c.crt_box), box: !!c.box,
    cisd: !!c.cisd, mss: !!c.mss,
    ob50: !!(c.ob50 || c.stopraid || c.price_50 || c.fibo_50),
    bb_cisd: !!(c.bb_cisd || c.bb),
    leg_strong: !!c.leg_strong, leg_fvg: !!c.leg_fvg, m15_cisd: !!c.m15_cisd, ifvg: !!c.ifvg,
    followThrough: !!c.followThrough,
    sr: !!(c.sr || (c.followThrough && c.stopraid)),
    breakob: !!(c.breakob || c.ob_broken)
  };
  m.links = m.links ? { '15': m.links['15']||'', '1': m.links['1']||'' } : { '15':'', '1':'' };
  return m;
}

/* ============================================================
   TABS & SEGMENTED BUTTONS
============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('view-'+btn.dataset.view).classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
  });
});
function goToView(v){ document.querySelector('.tab-btn[data-view="'+v+'"]').click(); }

function syncSegAria(el){
  el.querySelectorAll('button').forEach(b=> b.setAttribute('aria-pressed', b.classList.contains('on')?'true':'false'));
}
function initSeg(id, onChange){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    el.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    syncSegAria(el);
    if(onChange) onChange(b.dataset.val);
  });
}
function getSeg(id){ const b=document.querySelector('#'+id+' button.on'); return b? b.dataset.val : ''; }
function setSeg(id,val){
  const el = document.getElementById(id); if(!el) return;
  el.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.val===val));
  syncSegAria(el);
}

/* ============================================================
   KILLZONE BAR
============================================================ */
function pad2(n){ return String(n).padStart(2,'0'); }
function tzInfo(date, timeZone){
  const dtf = new Intl.DateTimeFormat('en-US',{ timeZone, hourCycle:'h23', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit' });
  const p = dtf.formatToParts(date).reduce((a,x)=>{ if(x.type!=='literal') a[x.type]=parseInt(x.value,10); return a; },{});
  const asUTC = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  return { offsetMin:(asUTC-date.getTime())/60000, y:p.year, mo:p.month, d:p.day, hour:p.hour, minute:p.minute, second:p.second };
}
function nyLocalToInstant(now, hh, mm){
  const { offsetMin, y, mo, d } = tzInfo(now, NY_TZ);
  return Date.UTC(y, mo-1, d, hh, mm, 0) - offsetMin*60000;
}

let kzPillEls = null;
function buildKillzoneBar(){
  const wrap = document.getElementById('kzPills');
  if(!wrap) return;
  wrap.innerHTML = KILLZONES.map(z=>
    `<div class="kz-pill"><span class="kz-dot"></span><span class="kzl">${esc(z.label)}</span>`+
    `<span class="kzt en">${pad2(z.h1)}:${pad2(z.m1)}–${pad2(z.h2)}:${pad2(z.m2)}</span>`+
    `<span class="kzd"></span></div>`
  ).join('') + `<div class="kz-pill" id="kzOut"><span class="kz-dot"></span><span class="kzl">Out of Killzone</span></div>`;
  kzPillEls = [...wrap.querySelectorAll('.kz-pill')];
}
function renderKillzoneBar(){
  if(!kzPillEls) buildKillzoneBar();
  const now = new Date();
  const ny = tzInfo(now, NY_TZ);
  const clock = document.getElementById('kzClock');
  if(clock) clock.textContent = `${pad2(ny.hour)}:${pad2(ny.minute)}:${pad2(ny.second)}`;

  const nowTs = now.getTime();
  let anyActive = false;

  KILLZONES.forEach((z,i)=>{
    const startTs = nyLocalToInstant(now, z.h1, z.m1);
    const endTs   = nyLocalToInstant(now, z.h2, z.m2);
    const pill = kzPillEls[i];
    if(!pill) return;
    let status, detail;
    if(nowTs>=startTs && nowTs<endTs){
      status='active'; anyActive = true;
      const left=Math.round((endTs-nowTs)/60000);
      detail=`${Math.floor(left/60)}h ${pad2(left%60)}m تا پایان`;
    } else if(nowTs<startTs){
      status='upcoming';
      const left=Math.round((startTs-nowTs)/60000);
      detail=`${Math.floor(left/60)}h ${pad2(left%60)}m تا شروع`;
    } else { status='done'; detail='تمام شد'; }
    pill.classList.toggle('active', status==='active');
    pill.classList.toggle('upcoming', status==='upcoming');
    const d = pill.querySelector('.kzd');
    if(d && d.textContent !== detail) d.textContent = detail;
  });

  if(kzPillEls && kzPillEls.length) {
    kzPillEls[kzPillEls.length-1].classList.toggle('active', !anyActive);
  }
}

let kzTimer = null;
function startKzTicker(){ if(!kzTimer){ renderKillzoneBar(); kzTimer = setInterval(renderKillzoneBar, 1000); } }
function stopKzTicker(){ if(kzTimer){ clearInterval(kzTimer); kzTimer = null; } }

function currentKillzone(){
  const now=new Date(), ts=now.getTime();
  for(const z of KILLZONES){
    if(ts>=nyLocalToInstant(now,z.h1,z.m1) && ts<nyLocalToInstant(now,z.h2,z.m2)) return z.label;
  }
  return 'Out of Killzone';
}

/* ============================================================
   CHECKLIST RENDERING
============================================================ */
const openHelp = new Set();

function helpBtn(step, ns){
  if(!step.help || step.helpAlways) return '';
  const key = ns+'.'+step.n;
  const on = openHelp.has(key);
  return `<button type="button" class="cl-help-btn ${on?'on':''}" data-help-toggle="${key}" aria-label="توضیح بیشتر">؟</button>`;
}
function helpPanel(step, ns){
  if(!step.help) return '';
  if(step.helpAlways) return `<div class="cl-help-panel">${step.help}</div>`;
  const key = ns+'.'+step.n;
  const on = openHelp.has(key);
  return `<div class="cl-help-panel ${on?'':'hidden'}" data-help-panel="${key}">${step.help}</div>`;
}

function renderChecklistBlocks(steps, state, ns){
  state = state || {};
  ns = ns || 'default';
  return steps.map(step=>{
    let head, body, skipped = false;
    if(step.type==='conditional'){
      skipped = step.skipIfKey && !!state[step.skipIfKey];
      head = `<div class="cl-head"><span class="cl-n en">${step.n}</span><span class="cl-t">${step.title} <i class="en">${step.tf}</i></span>${helpBtn(step, ns)}</div>`;
      if(skipped){
        body = `<div class="chips"><span class="cl-skip">${step.skipLabel||'غیرضروری'}</span></div>`;
      } else {
        const ft = !!state[step.followKey];
        const cond = !!state[step.condKey];
        body = `<div class="chips">
          <button type="button" class="chip en ${ft?'on':''}" data-follow-key="${step.followKey}">${step.followLabel}</button>
          <button type="button" class="chip en ${cond?'on':''}" data-cond-key="${step.condKey}" data-follow-key="${step.followKey}" ${ft?'':'disabled'}>${step.condLabel}</button>
        </div>`;
      }
    } else {
      head = `<div class="cl-head"><span class="cl-n en">${step.n}</span><span class="cl-t">${step.title} <i class="en">${step.tf}</i></span>${helpBtn(step, ns)}</div>`;
      body = `<div class="chips">${step.items.map(it=>`<button type="button" class="chip ${it.en?'en':''} ${state[it.key]?'on':''}" data-key="${it.key}" data-group="${step.n}" data-multi="${step.multi?1:0}">${it.label}</button>`).join('')}</div>`;
    }
    let note = '';
    if(step.note) note += `<div class="cl-note">${step.note}</div>`;
    if(step.condNotes){
      step.condNotes.forEach(cn=>{ if(state[cn.when]) note += `<div class="cl-note">${cn.text}</div>`; });
    }
    const rowClass = skipped ? 'skipped' : (stepDone(step,state) ? 'done' : '');
    return `<div class="cl-row ${rowClass}">${head}${body}${note}${helpPanel(step, ns)}</div>`;
  }).join('');
}

function wireChecklist(el, steps, state, after){
  el.querySelectorAll('.chip[data-key]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const key = chip.dataset.key;
      const isOn = !!state[key];
      if(chip.dataset.multi!=='1'){
        const step = steps.find(s=>s.n===chip.dataset.group);
        if(step) step.items.forEach(it=> state[it.key]=false);
      }
      state[key] = !isOn;
      after();
    });
  });
  el.querySelectorAll('.chip[data-follow-key]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(chip.dataset.condKey){
        state[chip.dataset.condKey] = !state[chip.dataset.condKey];
      } else {
        const fk = chip.dataset.followKey;
        state[fk] = !state[fk];
        if(!state[fk]){
          const step = steps.find(s=>s.followKey===fk);
          if(step) state[step.condKey] = false;
        }
      }
      after();
    });
  });
  el.querySelectorAll('[data-help-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const n = btn.dataset.helpToggle;
      if(openHelp.has(n)) openHelp.delete(n); else openHelp.add(n);
      after();
    });
  });
}

/* ============================================================
   TRADE FORM LOGIC
============================================================ */
let formSetupId = 'standard';
function renderFormSetupSwitch(){
  const el = document.getElementById('formSetupSwitch');
  if(!el) return;
  el.innerHTML = SETUP_ORDER.map(id=>{
    const s = SETUPS[id];
    return `<button type="button" class="chip accent-${s.accent} ${formSetupId===id?'on':''}" data-form-setup="${id}">${s.label}</button>`;
  }).join('');
  el.querySelectorAll('[data-form-setup]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.formSetup;
      if(id===formSetupId) return;
      formSetupId = id; formChecklistState = {}; renderFormChecklist();
    });
  });
}
function renderFormChecklist(){
  renderFormSetupSwitch();
  const el = document.getElementById('formChecklist');
  if(!el) return;
  const steps = getSetup(formSetupId).steps;
  el.innerHTML = renderChecklistBlocks(steps, formChecklistState, 'form:'+formSetupId);
  wireChecklist(el, steps, formChecklistState, renderFormChecklist);
}
function buildFormChecklist(setupId, checked){ formSetupId = setupId || 'standard'; formChecklistState = { ...(checked||{}) }; renderFormChecklist(); }

function applyResultUI(){
  const res = getSeg('segResult');
  const field = document.getElementById('rrField');
  const input = document.getElementById('f-rr');
  const lbl = document.getElementById('rrLabel');
  if(res==='be'){
    field.classList.add('hidden'); input.required = false; input.value = '';
  } else {
    field.classList.remove('hidden'); input.required = true;
    if(res==='win'){ lbl.textContent = 'R:R به‌دست‌آمده'; input.placeholder = 'مثلاً 2.5'; }
    else { lbl.textContent = 'اندازهٔ ضرر بر حسب R'; input.placeholder = 'مثلاً 1 یا 0.4'; }
  }
  const cbField = document.getElementById('couldBeField');
  if(res==='loss'){ cbField.classList.remove('hidden'); }
  else{ cbField.classList.add('hidden'); setSeg('segCouldBe','no'); }
}
function onResultChange(){
  document.getElementById('f-rr').value = getSeg('segResult')==='loss' ? '1' : '';
  applyResultUI();
}

initSeg('segTrend');
initSeg('segDirection');
initSeg('segKillzone');
initSeg('segResult', onResultChange);
initSeg('segCouldBe');

function updateFormCalcLine(){
  const lot = Number(document.getElementById('f-lot').value)||0;
  const gross = Number(document.getElementById('f-gross').value)||0;
  const commission = lot*(Number(settings.commissionPerLot)||0);
  document.getElementById('formCalcLine').textContent = `Commission: ${fmtUSD(commission)} · Net: ${fmtUSD(gross-commission)}`;
}
document.getElementById('f-lot').addEventListener('input', updateFormCalcLine);
document.getElementById('f-gross').addEventListener('input', updateFormCalcLine);

function resetForm(){
  document.getElementById('tradeForm').reset();
  document.getElementById('f-date').value = todayNY();
  document.getElementById('f-symbol').value = SYMBOL;
  setSeg('segTrend','bullish');
  setSeg('segDirection','buy');
  setSeg('segResult','win');
  setSeg('segKillzone', currentKillzone());
  setSeg('segCouldBe','no');
  applyResultUI();
  buildFormChecklist('standard');
  updateFormCalcLine();
  editingTradeId = null;
  document.getElementById('formTitle').textContent = 'ثبت معامله جدید';
  document.getElementById('submitFormBtn').textContent = 'ذخیره معامله';
}

function openEditForm(t){
  editingTradeId = t.id;
  document.getElementById('formTitle').textContent = 'ویرایش معامله';
  document.getElementById('submitFormBtn').textContent = 'به‌روزرسانی معامله';
  document.getElementById('f-date').value = t.date||'';
  setSeg('segTrend', t.trend||'bullish');
  setSeg('segDirection', t.direction||'buy');
  setSeg('segResult', t.result||'win');
  setSeg('segKillzone', t.killzone||'Out of Killzone');
  applyResultUI();
  document.getElementById('f-rr').value = t.result==='be' ? '' : Math.abs(Number(t.rr)||0);
  document.getElementById('f-idealrr').value = t.idealRR ?? '';
  setSeg('segCouldBe', t.couldBeProfitOrBE ? 'yes' : 'no');
  document.getElementById('f-lot').value = t.lotSize ?? '';
  document.getElementById('f-gross').value = t.grossPL ?? '';
  document.getElementById('f-entryReason').value = t.entryReason||'';
  document.getElementById('f-exitReason').value = t.exitReason||'';
  document.getElementById('f-notes').value = t.notes||'';
  document.getElementById('f-link15').value = (t.links&&t.links['15'])||'';
  document.getElementById('f-link1').value = (t.links&&t.links['1'])||'';
  buildFormChecklist(t.setupId||'standard', t.checklist||{});
  updateFormCalcLine();
  const p=document.getElementById('tradeFormPanel');
  p.classList.remove('hidden');
  p.scrollIntoView({behavior:'smooth', block:'start'});
}

document.getElementById('newTradeBtn').addEventListener('click', ()=>{
  resetForm();
  const p=document.getElementById('tradeFormPanel');
  p.classList.remove('hidden');
  p.scrollIntoView({behavior:'smooth', block:'start'});
});
document.getElementById('cancelFormBtn').addEventListener('click', ()=>{
  document.getElementById('tradeFormPanel').classList.add('hidden');
  editingTradeId=null;
});

document.getElementById('tradeForm').addEventListener('submit', e=>{
  e.preventDefault();
  const result = getSeg('segResult') || 'win';
  const rrRaw = Math.abs(Number(document.getElementById('f-rr').value)||0);
  let rr = 0;
  if(result==='win'){ rr = rrRaw; }
  else if(result==='loss'){ rr = -(rrRaw || 1); }

  const data = {
    v: SCHEMA_VERSION,
    date: document.getElementById('f-date').value,
    symbol: SYMBOL,
    trend: getSeg('segTrend') || 'bullish',
    direction: getSeg('segDirection') || 'buy',
    result, rr,
    idealRR: Number(document.getElementById('f-idealrr').value)||0,
    couldBeProfitOrBE: result==='loss' && getSeg('segCouldBe')==='yes',
    killzone: getSeg('segKillzone') || 'Out of Killzone',
    lotSize: Number(document.getElementById('f-lot').value)||0,
    grossPL: Number(document.getElementById('f-gross').value)||0,
    entryReason: document.getElementById('f-entryReason').value,
    exitReason: document.getElementById('f-exitReason').value,
    notes: document.getElementById('f-notes').value,
    setupId: formSetupId,
    checklist: { ...formChecklistState },
    links: {
      '15': document.getElementById('f-link15').value.trim(),
      '1': document.getElementById('f-link1').value.trim()
    }
  };

  if(editingTradeId){
    const i = trades.findIndex(t=>t.id===editingTradeId);
    if(i>-1) trades[i] = { ...trades[i], ...data };
  } else {
    trades.unshift({ id:uid(), createdAt:Date.now(), ...data });
  }
  const ok = commitTrades();
  document.getElementById('tradeFormPanel').classList.add('hidden');
  editingTradeId = null;
  refreshAll();
  showToast(ok ? 'معامله ذخیره شد ✓' : 'خطا در ذخیره‌سازی');
});

/* ============================================================
   TRADES LIST
============================================================ */
function populateFilters(){
  const sel = document.getElementById('filterKillzone');
  const cur = sel.value;
  const used = KZ_OPTIONS.filter(k=> trades.some(t=>t.killzone===k));
  sel.innerHTML = '<option value="">همه‌ی کیل‌زون‌ها</option>' + used.map(k=>`<option value="${k}">${k}</option>`).join('');
  sel.value = cur;
}
function filteredTrades(){
  const kz = document.getElementById('filterKillzone').value;
  const dir = document.getElementById('filterDirection').value;
  const res = document.getElementById('filterResult').value;
  return trades
    .filter(t=> !kz || t.killzone===kz)
    .filter(t=> !dir || t.direction===dir)
    .filter(t=> !res || t.result===res)
    .sort((a,b)=> new Date(b.date)-new Date(a.date) || (b.createdAt||0)-(a.createdAt||0));
}
function rClass(t){ return t.result==='win' ? 'pos' : (t.result==='loss' ? 'neg' : 'zero'); }

function renderTradesList(){
  const list = filteredTrades();
  const wrap = document.getElementById('tradesList');
  if(!list.length){
    wrap.innerHTML = `<div class="empty-state"><p>معامله‌ای نیست. با «ثبت معامله جدید» شروع کن.</p></div>`;
    return;
  }
  wrap.innerHTML = list.map(t=>`
    <div class="trade-card" id="card-${esc(t.id)}">
      <div class="trade-row" data-id="${esc(t.id)}" role="button" tabindex="0">
        <span class="date en">${esc(t.date||'')}</span>
        <span class="pair"><span class="en">NQ</span>
          <span class="badge ${t.direction==='buy'?'buy':'sell'}">${t.direction==='buy'?'BUY':'SELL'}</span>
          <span class="badge trend">${t.trend==='bearish'?'Bearish 15m':'Bullish 15m'}</span>
        </span>
        <span class="kzcell">${esc(t.killzone||'')}</span>
        <span><span class="badge ${esc(t.result)}">${t.result==='win'?'WIN':t.result==='loss'?'LOSS':'BE'}</span></span>
        <span class="r ${rClass(t)} en">${fmtR(t.rr)}</span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS.chevron}</svg>
      </div>
      <div class="trade-detail"><div class="trade-detail-inner" data-loaded="0" data-id="${esc(t.id)}"></div></div>
    </div>`).join('');

  wrap.querySelectorAll('.trade-row').forEach(row=>{
    row.addEventListener('click', ()=> toggleTradeCard(row.dataset.id));
  });
}

function toggleTradeCard(id){
  const card = document.getElementById('card-'+id);
  if(!card) return;
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('.trade-card.open').forEach(c=>{ if(c!==card) c.classList.remove('open'); });
  card.classList.toggle('open', !isOpen);
  if(!isOpen){
    const inner = card.querySelector('.trade-detail-inner');
    if(inner.dataset.loaded==='0'){ inner.dataset.loaded='1'; renderTradeDetail(inner,id); }
  }
}

function renderTradeDetail(inner, id){
  const t = trades.find(x=>x.id===id);
  if(!t) return;
  const commission = calcCommission(t), net = calcNet(t);
  const linkBtn = (tf,url)=>{
    const u = safeUrl(url);
    return u ? `<span class="detail-link" data-url="${esc(u)}" role="button" tabindex="0">${tf} chart ↗</span>`
             : `<span class="detail-link off">${tf} — no link</span>`;
  };

  inner.innerHTML = `
    <div class="detail-meta-grid">
      <div class="detail-meta-item"><div class="k en">RESULT</div><div class="v">${t.result==='win'?'Win':t.result==='loss'?'Loss':'BE'}</div></div>
      <div class="detail-meta-item"><div class="k en">R:R</div><div class="v en" style="color:${t.result==='win'?'var(--blue)':t.result==='loss'?'var(--red)':'var(--muted)'}">${fmtR(t.rr)}</div></div>
      <div class="detail-meta-item"><div class="k en">LOT</div><div class="v en">${t.lotSize||0}</div></div>
      <div class="detail-meta-item"><div class="k en">GROSS</div><div class="v en">${fmtUSD(t.grossPL)}</div></div>
      <div class="detail-meta-item"><div class="k en">COMMISSION</div><div class="v en">${fmtUSD(commission)}</div></div>
      <div class="detail-meta-item"><div class="k en">NET</div><div class="v en" style="color:${net>=0?'var(--blue)':'var(--red)'}">${fmtUSD(net)}</div></div>
    </div>
    <div class="detail-cl"><span class="cl-setup-badge">${getSetup(t.setupId).label}</span>${getSetup(t.setupId).steps.map(step=>{
      const done = stepDone(step,t.checklist||{});
      return `<span class="${done?'done':''}">${done?'✓':'—'} ${step.n}. ${step.title}</span>`;
    }).join('')}</div>
    <div class="detail-links">${linkBtn('15m', t.links&&t.links['15'])}${linkBtn('1m', t.links&&t.links['1'])}</div>
    <div class="detail-notes-grid">
      <div class="detail-note-box"><h5>دلیل ورود</h5><p>${esc(t.entryReason) || '—'}</p></div>
      <div class="detail-note-box"><h5>دلیل خروج</h5><p>${esc(t.exitReason) || '—'}</p></div>
    </div>
    <div class="detail-note-box" style="margin-bottom:11px;"><h5>نکات تکنیکال و روانشناسی</h5><p>${esc(t.notes) || '—'}</p></div>
    <div class="detail-actions">
      <button class="btn btn-sm" data-edit="${esc(id)}">ویرایش</button>
      <button class="btn btn-danger btn-sm" data-del="${esc(id)}">حذف</button>
    </div>`;

  inner.querySelectorAll('.detail-link[data-url]').forEach(s=>{
    s.addEventListener('click', ()=> window.open(s.dataset.url,'_blank','noopener'));
  });
  inner.querySelector('[data-edit]').addEventListener('click', e=>{ e.stopPropagation(); openEditForm(t); });
  inner.querySelector('[data-del]').addEventListener('click', e=>{
    e.stopPropagation();
    if(!confirm('این معامله حذف شود؟')) return;
    trades = trades.filter(x=>x.id!==id);
    commitTrades();
    refreshAll();
    showToast('معامله حذف شد');
  });
}

['filterKillzone','filterDirection','filterResult'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', renderTradesList);
});

/* ============================================================
   DASHBOARD STATS & EQUITY
============================================================ */
function computeStats(list){
  const n = list.length;
  const wins = list.filter(t=>t.result==='win').length;
  const losses = list.filter(t=>t.result==='loss').length;
  const bes = list.filter(t=>t.result==='be').length;
  const totalR = list.reduce((s,t)=>s+Number(t.rr||0),0);
  const decided = wins+losses;
  return { n, wins, losses, bes, totalR, avgR: n? totalR/n : 0, winRate: decided? wins/decided*100 : 0 };
}

function maxLosingStreak(list){
  const sorted = [...list].sort((a,b)=> new Date(a.date)-new Date(b.date) || (a.createdAt||0)-(b.createdAt||0));
  let max=0, cur=0;
  sorted.forEach(t=>{ if(t.result==='loss'){ cur++; max=Math.max(max,cur); } else if(t.result==='win'){ cur=0; } });
  return max;
}

function renderStatGrid(){
  const s = computeStats(trades);
  const bal = calcBalance();
  const netChange = bal - (Number(settings.initialBalance)||0);
  const best = trades.length ? Math.max(...trades.map(t=>Number(t.rr)||0)) : 0;

  document.getElementById('statGridPerf').innerHTML = `
    <div class="stat-card"><div class="lbl">TOTAL R</div><div class="val ${s.totalR>=0?'pos':'neg'} en">${fmtR(s.totalR)}</div><div class="sub">${s.n} معامله</div></div>
    <div class="stat-card"><div class="lbl">WIN RATE</div><div class="val ${s.winRate>=50?'pos':'neg'} en">${s.winRate.toFixed(0)}%</div><div class="sub">${s.wins}W · ${s.losses}L · ${s.bes}BE</div></div>
    <div class="stat-card"><div class="lbl">AVG R</div><div class="val ${s.avgR>=0?'pos':'neg'} en">${s.avgR>=0?'+':''}${s.avgR.toFixed(2)}R</div><div class="sub">میانگین هر معامله</div></div>
    <div class="stat-card"><div class="lbl">BEST R</div><div class="val pos en">${fmtR(best)}</div><div class="sub">باخت متوالی: ${maxLosingStreak(trades)}</div></div>
  `;
  document.getElementById('statGridAccount').innerHTML = `
    <div class="stat-card"><div class="lbl">BALANCE</div><div class="val ${netChange>=0?'pos':'neg'} en">${fmtUSD(bal)}</div></div>
    <div class="stat-card"><div class="lbl">NET CHANGE</div><div class="val ${netChange>=0?'pos':'neg'} en">${netChange>=0?'+':''}${fmtUSD(netChange)}</div></div>
    <div class="stat-card"><div class="lbl">COMMISSION</div><div class="val en">${fmtUSD(trades.reduce((a,t)=>a+calcCommission(t),0))}</div></div>
    <div class="stat-card"><div class="lbl">INITIAL</div><div class="val en">${fmtUSD(settings.initialBalance)}</div></div>
  `;
}

let pnlRange = 'all';
function chronological(list){
  return [...list].sort((a,b)=> new Date(a.date)-new Date(b.date) || (a.createdAt||0)-(a.createdAt||0));
}
function annotateWithBalance(list){
  const sorted = chronological(list);
  let bal = Number(settings.initialBalance)||0;
  return sorted.map(t=>{
    const net = calcNet(t);
    const before = bal;
    bal += net;
    return { t, net, before, after:bal, eff: t.result };
  });
}
function rangeStartISO(range){
  const today = todayNY();
  if(range==='7d')  return shiftISO(today, -6);
  if(range==='30d') return shiftISO(today, -29);
  if(range==='3m')  return shiftISO(today, 0, -3);
  if(range==='ytd') return today.slice(0,4)+'-01-01';
  return null;
}
function inRange(a, range){
  if(range==='all') return true;
  const start = rangeStartISO(range);
  return !start || (a.t.date || '') >= start;
}
function computeAnnotated(){
  return annotateWithBalance(trades).filter(a=>inRange(a, pnlRange));
}

function renderPnlStats(ann){
  const row = document.getElementById('pnlStatsRow');
  if(!trades.length){ row.innerHTML = ''; return; }
  const totalNet = ann.reduce((s,a)=>s+a.net,0);
  const initial = Number(settings.initialBalance)||0;
  const bal = ann.length ? ann[ann.length-1].after : calcBalance();

  row.innerHTML = `
    <div class="pnl-stat"><span class="lbl en">TOTAL PNL</span><span class="val ${totalNet>=0?'pos':'neg'} en">${fmtUSD(totalNet)}</span></div>
    <div class="pnl-stat"><span class="lbl en">BALANCE</span><span class="val ${bal>=initial?'pos':'neg'} en">${fmtUSD(bal)}</span></div>
    <div class="pnl-stat"><span class="lbl en">TRADES</span><span class="val en">${ann.length}</span></div>
  `;
}

function renderEquityCurve(ann){
  const wrap = document.getElementById('equityWrap');
  if(!ann.length){ wrap.innerHTML = `<div class="eq-empty">هنوز معامله‌ای در این بازه ثبت نشده.</div>`; return; }
  wrap.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--muted);">چارت اکویتی منحنی PnL فعال است (${ann.length} معامله)</div>`;
}

function renderDashboard(){
  renderStatGrid();
  const ann = computeAnnotated();
  renderPnlStats(ann);
  renderEquityCurve(ann);
}

/* ============================================================
   CALENDAR
============================================================ */
let calState = { year: Number(todayNY().slice(0,4)), month: Number(todayNY().slice(5,7))-1, mode:'usd', view:'month' };
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function dayStats(dateStr){
  const list = tradesByDate.get(dateStr) || [];
  const n = list.length;
  const netUSD = list.reduce((s,t)=>s+calcNet(t),0);
  const totalR = list.reduce((s,t)=>s+Number(t.rr||0),0);
  return { n, netUSD, totalR };
}

function shiftMonth(delta){
  let m = calState.month + delta, y = calState.year;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  calState.month = m; calState.year = y;
  renderCalendar();
}
function jumpToday(){ 
  const d=todayNY(); 
  calState.year=Number(d.slice(0,4)); 
  calState.month=Number(d.slice(5,7))-1; 
  renderCalendar(); 
}

function renderMonthGrid(){
  const y = calState.year, m = calState.month;
  const label = document.getElementById('calMonthLabel');
  if(label) label.textContent = MONTHS_EN[m] + ' ' + y;

  const daysInMonth = new Date(y, m+1, 0).getDate();
  const cells = [];
  for(let d=1; d<=daysInMonth; d++) cells.push({ dateStr: `${y}-${pad2(m+1)}-${pad2(d)}`, day:d });

  const grid = document.getElementById('calGrid');
  if(!grid) return;
  grid.innerHTML = cells.map(c=>{
    const stats = dayStats(c.dateStr);
    return `<div class="cal-cell ${stats.n>0?(stats.netUSD>=0?'pos':'neg'):''}">
      <div class="cal-daynum en">${c.day}</div>
      ${stats.n>0 ? `<div class="cal-pl en">${fmtUSD(stats.netUSD)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderCalendar(){
  rebuildIndex();
  renderMonthGrid();
}

/* ============================================================
   STANDALONE CHECKLIST
============================================================ */
let currentSetupId = null;
function renderSetupPicker(){
  const el = document.getElementById('setupPicker');
  if(!el) return;
  el.innerHTML = SETUP_ORDER.map(id=>{
    const s = SETUPS[id];
    return `<button type="button" class="setup-card accent-${s.accent} ${currentSetupId===id?'active':''}" data-setup="${id}">
        <div class="setup-card-title">${s.label}</div>
        <div class="setup-card-desc">${s.desc}</div>
      </button>`;
  }).join('');
  el.querySelectorAll('.setup-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{ currentSetupId = btn.dataset.setup; renderStandaloneChecklist(); });
  });
}

function renderStandaloneChecklist(){
  renderSetupPicker();
  const body = document.getElementById('checklistBody');
  if(!currentSetupId){ if(body) body.classList.add('hidden'); return; }
  if(body) body.classList.remove('hidden');
  const setup = SETUPS[currentSetupId];
  const state = standaloneChecklistState[currentSetupId] || (standaloneChecklistState[currentSetupId]={});
  document.getElementById('clSetupTitle').textContent = setup.label;
  const el = document.getElementById('standaloneChecklist');
  el.innerHTML = renderChecklistBlocks(setup.steps, state, 'standalone:'+currentSetupId);
  wireChecklist(el, setup.steps, state, renderStandaloneChecklist);
}

document.getElementById('clResetBtn')?.addEventListener('click', ()=>{
  if(currentSetupId) standaloneChecklistState[currentSetupId] = {};
  renderStandaloneChecklist();
});
document.getElementById('clGoJournalBtn')?.addEventListener('click', ()=>{
  if(!currentSetupId) return;
  goToView('journal');
  resetForm();
  document.getElementById('tradeFormPanel').classList.remove('hidden');
  buildFormChecklist(currentSetupId, standaloneChecklistState[currentSetupId]);
});

/* ============================================================
   ACCOUNT & EXPORT
============================================================ */
function populateAccountFields(){
  const initInput = document.getElementById('acc-initial');
  if(initInput) initInput.value = settings.initialBalance;
  const commInput = document.getElementById('acc-commission');
  if(commInput) commInput.value = settings.commissionPerLot;
  renderAccountPreview();
}

function renderAccountPreview(){
  const initial = Number(document.getElementById('acc-initial')?.value)||0;
  const commission = Number(document.getElementById('acc-commission')?.value)||0;
  const netSum = trades.reduce((s,t)=> s + ((Number(t.grossPL)||0) - (Number(t.lotSize)||0)*commission), 0);
  const bal = initial+netSum;
  const el = document.getElementById('acc-balance');
  if(el){
    el.textContent = fmtUSD(bal);
    el.style.color = bal>=initial ? 'var(--blue)' : 'var(--red)';
  }
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', ()=>{
  settings.initialBalance = Number(document.getElementById('acc-initial').value)||0;
  settings.commissionPerLot = Number(document.getElementById('acc-commission').value)||0;
  const ok = saveSettings(settings);
  refreshAll();
  showToast(ok ? 'تنظیمات ذخیره شد ✓' : 'خطا در ذخیره‌سازی');
});

function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type:mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function exportData(){
  const snapshot = { schemaVersion:SCHEMA_VERSION, settings, trades, exportedAt:new Date().toISOString() };
  downloadBlob(JSON.stringify(snapshot, null, 2), `nq-journal-${todayNY()}.json`, 'application/json');
  showToast('فایل JSON دانلود شد');
}

const CSV_COLS = [
  ['id','id'], ['date','date'], ['symbol','symbol'], ['trend','trend'], ['direction','direction'],
  ['result','result'], ['r','rr'], ['ideal_r','idealRR'], ['could_be_profit','couldBeProfitOrBE'],
  ['killzone','killzone'], ['lot','lotSize'], ['gross_pl','grossPL'],
  ['commission','__commission'], ['net_pl','__net'], ['setup','__setup'],
  ['entry_reason','entryReason'], ['exit_reason','exitReason'], ['notes','notes']
];

function csvCell(v){
  if(v===null || v===undefined) return '';
  if(typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v);
  return /[",\n\r;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}

function tradeToCsvRow(t){
  return CSV_COLS.map(([,key])=>{
    if(key==='__commission') return calcCommission(t).toFixed(2);
    if(key==='__net') return calcNet(t).toFixed(2);
    if(key==='__setup') return getSetup(t.setupId).label;
    return csvCell(t[key]);
  }).join(',');
}

function exportCSV(){
  if(!trades.length) return alert('هیچ معامله‌ای برای خروجی وجود ندارد.');
  const header = CSV_COLS.map(([label])=> csvCell(label)).join(',');
  const rows = trades.map(tradeToCsvRow);
  const csvStr = '\uFEFF' + [header, ...rows].join('\r\n');
  downloadBlob(csvStr, `nq-trades-${todayNY()}.csv`, 'text/csv;charset=utf-8;');
  showToast('فایل CSV دانلود شد');
}

function clearAllData(){
  if(!confirm('همه‌ی معاملات و تنظیمات حذف شود؟')) return;
  trades=[]; settings={ ...DEFAULT_SETTINGS };
  commitTrades(); saveSettings(settings);
  populateAccountFields(); refreshAll();
  showToast('همه‌ی داده‌ها پاک شد');
}

function clearTradesOnly(){
  if(!confirm('همه‌ی معاملات حذف شود؟ تنظیمات حساب می‌ماند.')) return;
  trades=[]; commitTrades();
  refreshAll();
  showToast('همه‌ی معاملات پاک شد');
}
