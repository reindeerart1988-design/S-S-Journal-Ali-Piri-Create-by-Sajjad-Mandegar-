// ==========================================
// تنظیمات اتصال به Supabase
// ==========================================
const SUPABASE_URL = "https://iazjcnpnybywhorfigvq.supabase.co";
const SUPABASE_KEY = "sb_publishable_QLI3Adqlm-tk__4sUD8I1w_7GzJ8NPT";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

function hideAuthLoader(){
    const loader = document.getElementById('auth-loader');
    if(loader) loader.style.display = 'none';
}

function showAuthMsg(msg){
    const el = document.getElementById('auth-msg');
    if(el) el.textContent = msg || '';
}

/* Sends a password-reset email; Supabase redirects the user back to this
   same page with a recovery token in the URL, which onAuthStateChange
   below turns into the "PASSWORD_RECOVERY" event. */
async function handleForgotPassword(){
    const email = (document.getElementById('auth-email').value || '').trim();
    if(!email) return showAuthMsg('اول ایمیلت را در کادر بالا وارد کن، بعد روی این لینک بزن.');
    try{
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });
        if(error) throw error;
        showAuthMsg('ایمیل بازیابی رمز عبور ارسال شد — صندوق ورودی‌ات را چک کن.');
    }catch(e){
        showAuthMsg('خطا در ارسال ایمیل بازیابی: ' + e.message);
    }
}

function showResetPasswordForm(){
    hideAuthLoader();
    const modal = document.getElementById('auth-modal');
    const resetModal = document.getElementById('reset-password-modal');
    const shell = document.getElementById('app-shell');
    if(modal) modal.style.display = 'none';
    if(shell) shell.style.display = 'none';
    if(resetModal) resetModal.style.display = '';
}

async function handleUpdatePassword(){
    const pw = document.getElementById('reset-password-input').value;
    const msgEl = document.getElementById('reset-password-msg');
    if(!pw || pw.length < 6){
        if(msgEl) msgEl.textContent = 'رمز عبور باید حداقل ۶ کاراکتر باشد.';
        return;
    }
    try{
        const { error } = await supabaseClient.auth.updateUser({ password: pw });
        if(error) throw error;
        if(msgEl){ msgEl.style.color = '#10B981'; msgEl.textContent = 'رمز عبور تغییر کرد! در حال ورود…'; }
        setTimeout(()=> location.href = window.location.origin + window.location.pathname, 1200);
    }catch(e){
        if(msgEl) msgEl.textContent = 'خطا: ' + e.message;
    }
}

supabaseClient.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY') showResetPasswordForm();
});

function getInitials(user){
    if(!user) return '?';
    const name = (user.user_metadata && user.user_metadata.full_name) || '';
    if(name.trim()){
        const parts = name.trim().split(/\s+/);
        return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
    }
    return (user.email || '?')[0].toUpperCase();
}

/* Fills the small profile chip (top bar) and the profile panel (Account tab)
   with the current user's name/avatar — falls back to initials if no photo. */
function renderUserProfile(){
    if(!currentUser) return;
    const meta = currentUser.user_metadata || {};
    const name = meta.full_name || '';
    const avatarUrl = meta.avatar_url || '';
    const initials = getInitials(currentUser);
    const avatarHtml = avatarUrl ? `<img src="${avatarUrl}" alt="">` : initials;

    const chipAvatar = document.getElementById('profileAvatar');
    const chipName = document.getElementById('profileName');
    const chipEmail = document.getElementById('profileEmailMini');
    const mobileAvatar = document.getElementById('profileAvatarMobile');
    if(chipAvatar) chipAvatar.innerHTML = avatarHtml;
    if(mobileAvatar) mobileAvatar.innerHTML = avatarHtml;
    if(chipName) chipName.textContent = name || currentUser.email || '';
    if(chipEmail) chipEmail.textContent = currentUser.email || '';

    const editAvatar = document.getElementById('profileEditAvatar');
    if(editAvatar) editAvatar.innerHTML = avatarHtml;

    const nameInput = document.getElementById('profile-name-input');
    if(nameInput) nameInput.value = name;

    const emailDisplay = document.getElementById('profile-email-display');
    if(emailDisplay) emailDisplay.textContent = 'ایمیل: ' + (currentUser.email || '');
}

/* Save the display name typed into the Account tab */
async function saveProfile(){
    const input = document.getElementById('profile-name-input');
    const full_name = (input && input.value || '').trim();
    try{
        const { data, error } = await supabaseClient.auth.updateUser({ data: { full_name } });
        if(error) throw error;
        currentUser = data.user;
        renderUserProfile();
        showToast('پروفایل ذخیره شد ✓');
    }catch(e){
        console.error('Profile save failed', e);
        showToast('ذخیرهٔ پروفایل ناموفق بود');
    }
}

/* Upload a new avatar photo to the "avatars" Storage bucket and save its
   public URL on the user's profile. Requires a public "avatars" bucket. */
async function uploadAvatar(file){
    if(!currentUser || !file) return;
    try{
        showToast('در حال آپلود عکس…');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${currentUser.id}/avatar.${ext}`;
        const { error: upErr } = await supabaseClient.storage
            .from('avatars')
            .upload(path, file, { upsert:true, cacheControl:'3600' });
        if(upErr) throw upErr;
        const { data: pub } = supabaseClient.storage.from('avatars').getPublicUrl(path);
        const avatar_url = pub.publicUrl + '?t=' + Date.now();
        const { data, error } = await supabaseClient.auth.updateUser({ data: { avatar_url } });
        if(error) throw error;
        currentUser = data.user;
        renderUserProfile();
        showToast('عکس پروفایل به‌روزرسانی شد ✓');
    }catch(e){
        console.error('Avatar upload failed', e);
        showToast('آپلود عکس ناموفق بود — باکت "avatars" را در Supabase ساخته‌ای؟');
    }
}

// نمایش برنامه بعد از ورود موفق / پنهان‌کردن فرم ورود
function showApp(user){
    currentUser = user;
    hideAuthLoader();
    const modal = document.getElementById('auth-modal');
    const shell = document.getElementById('app-shell');
    if (modal) modal.style.display = 'none';
    if (shell) shell.style.display = '';
    renderUserProfile();
}

// نمایش فرم ورود / پنهان‌کردن برنامه (کاربر لاگین نیست)
function showAuthForm(){
    currentUser = null;
    hideAuthLoader();
    const modal = document.getElementById('auth-modal');
    const shell = document.getElementById('app-shell');
    if (modal) modal.style.display = '';
    if (shell) shell.style.display = 'none';
}

// بررسی وضعیت ورود به محض لود شدن صفحه (بدون هیچ اتصال گوگلی)
window.addEventListener('DOMContentLoaded', async () => {
    try{
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const approved = await isUserApproved(user.id);
            if (approved) {
                showApp(user);
                if (typeof loadUserTrades === 'function') await loadUserTrades();
            } else {
                await supabaseClient.auth.signOut();
                showAuthForm();
                showAuthMsg("حساب شما هنوز توسط مدیر تایید نشده است.");
            }
        } else {
            showAuthForm();
        }
    }catch(e){
        console.error('Supabase auth check failed', e);
        showAuthForm();
    }

    const profileChip = document.getElementById('profileChip');
    if(profileChip) profileChip.addEventListener('click', ()=>{ if(typeof goToView==='function') goToView('account'); });

    const sidebarProfile = document.getElementById('sidebarProfile');
    if(sidebarProfile) sidebarProfile.addEventListener('click', ()=>{ if(typeof goToView==='function') goToView('account'); });

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if(saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);

    const avatarInput = document.getElementById('avatarInput');
    if(avatarInput) avatarInput.addEventListener('change', (e)=>{
        const f = e.target.files[0];
        if(f) uploadAvatar(f);
        e.target.value = '';
    });
});

/* بررسی می‌کند که آیا حساب کاربر توسط مدیر تایید شده است یا نه.
   این تابع سطر متناظر کاربر را در جدول profiles می‌خواند. */
async function isUserApproved(userId){
    try{
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('is_approved')
            .eq('id', userId)
            .single();
        if(error) throw error;
        return !!(data && data.is_approved);
    }catch(e){
        console.error('Approval check failed', e);
        return false;
    }
}

// تابع ثبت‌نام کاربر جدید
async function handleSignUp() {
    const name = (document.getElementById('auth-name').value || '').trim();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if(!email || !password) return showAuthMsg("لطفاً ایمیل و رمز عبور را وارد کنید.");

    const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
    });
    if (error) showAuthMsg("خطا در ثبت‌نام: " + error.message);
    else showAuthMsg("ثبت‌نام موفقیت‌آمیز بود! اکنون می‌توانید وارد شوید.");
}

// تابع ورود به حساب
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if(!email || !password) return showAuthMsg("لطفاً ایمیل و رمز عبور را وارد کنید.");

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        showAuthMsg("خطا در ورود: " + error.message);
        return;
    }

    const approved = await isUserApproved(data.user.id);
    if (!approved) {
        showAuthMsg("حساب شما هنوز توسط مدیر تایید نشده است. لطفاً کمی صبر کنید و دوباره امتحان کنید.");
        await supabaseClient.auth.signOut();
        return;
    }

    showAuthMsg('');
    showApp(data.user);
    if (typeof loadUserTrades === 'function') await loadUserTrades();
}

// تابع خروج از حساب
async function handleLogout() {
    await supabaseClient.auth.signOut();
    try{ localStorage.removeItem('ss:trades'); localStorage.removeItem('ss:settings'); }catch(e){}
    location.reload();
}
// ==========================================
/* ============================================================
   DATA
============================================================ */
/* Shared first step for every setup: finding the liquidity POI on the 15m chart. */
const STEP_POI = {n:'1', title:'Liquidity / POI', tf:'15m', items:['BSL','SSL','FVG','OB'].map(label=>({key:label.toLowerCase(),label,en:true}))};
const STEP_CRT_BOX = {n:'2',title:'CRT / BOX',tf:'15m',items:[{key:'withCrt',label:'با <bdi dir="ltr">CRT/BOX</bdi>'},{key:'withoutCrt',label:'بدون <bdi dir="ltr">CRT/BOX</bdi>'}]};
const STEP_CONFIRMATION = {n:'3',title:'Confirmation',tf:'1m',items:[{key:'cisd',label:'CISD',en:true},{key:'mss',label:'MSS',en:true}]};
const SETUPS = {standard:{id:'standard',label:'چک‌لیست استراتژی',tag:'NQ',accent:'blue',desc:'',steps:[
 STEP_POI,STEP_CRT_BOX,STEP_CONFIRMATION,
 {n:'4',title:'iFVG / CISD',tf:'1m',multi:true,items:[{key:'ifvg',label:'iFVG',en:true},{key:'entryCisd',label:'CISD',en:true,requires:'ifvg'}]},
 {n:'5',title:'پولبک',tf:'1m',items:[{key:'pullbackCisd',label:'پولبک به <bdi dir="ltr">CISD</bdi>'}]},
 {n:'6',title:'شکست OB',tf:'1m',items:[{key:'breakob',label:'شکست <bdi dir="ltr">OB</bdi>'}]}
]}};
const SETUP_ORDER = ['standard'];
function getSetup(id){ return SETUPS[id] || SETUPS.standard; }

function stepDone(step, state){
  state = state || {};
  if(step.skipIfKey && state[step.skipIfKey]) return true;
  if(step.type==='conditional'){
    if(!state[step.followKey]) return true; /* no follow-through => this step isn't required */
    return !!state[step.condKey];
  }
  if(step.multi) return step.items.every(it=>!!state[it.key] && (!it.requires || !!state[it.requires]));
  return step.items.some(it=>!!state[it.key]);
}
function stepsDoneCount(steps, state){ return steps.filter(s=>stepDone(s,state)).length; }

/* Killzone windows — defined and displayed in NEW YORK local time (DST handled automatically).
   Two non-overlapping windows: 08:30–11:00 and 11:00–15:00. */
const KILLZONES = [
  { label:'NY AM', h1:8, m1:30, h2:11, m2:0 },
  { label:'NY PM', h1:11, m1:0, h2:15, m2:0 }
];
const NY_TZ = 'America/New_York';
const KZ_OPTIONS = ['NY AM','NY PM','Out of Killzone','NY Session','London'];
const SYMBOL = 'NQ';

const ICONS = { chevron:'<path d="m6 9 6 6 6-6"/>' };

/* ============================================================
   STORAGE
============================================================ */
const DEFAULT_SETTINGS = { initialBalance:10000, commissionPerLot:5 };
const SCHEMA_VERSION = 5;

/* Every string that comes from the user (or from an imported file) is escaped
   before it is ever put into innerHTML. */
const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>ESC_MAP[c]); }
function safeUrl(u){ u = String(u==null?'':u).trim(); return /^https?:\/\//i.test(u) ? u : ''; }

function flagStorageProblem(msg){
  const b = document.getElementById('storageWarn');
  if(!b) return;
  if(msg){ document.getElementById('storageWarnText').textContent = msg; b.classList.add('on'); }
  else b.classList.remove('on');
}

function loadTrades(){ try{ const v=localStorage.getItem('ss:trades'); return v?JSON.parse(v):[]; }catch(e){ return []; } }
function saveTrades(list){
  try{ localStorage.setItem('ss:trades', JSON.stringify(list)); flagStorageProblem(''); return true; }
  catch(e){
    flagStorageProblem('حافظهٔ مرورگر پر است یا نوشتن ممکن نیست. داده‌های این نشست ذخیره نشده‌اند — همین حالا خروجی JSON بگیر.');
    return false;
  }
}
function loadSettings(){
  try{ const v=localStorage.getItem('ss:settings'); return Object.assign({}, DEFAULT_SETTINGS, v?JSON.parse(v):{}); }
  catch(e){ return { ...DEFAULT_SETTINGS }; }
}
function saveSettings(s){
  try{ localStorage.setItem('ss:settings', JSON.stringify(s)); flagStorageProblem(''); return true; }
  catch(e){ flagStorageProblem('ذخیرهٔ تنظیمات ممکن نشد (حافظهٔ مرورگر پر است).'); return false; }
}
function loadTheme(){ try{ return localStorage.getItem('ss:theme') || 'dark'; }catch(e){ return 'dark'; } }
function saveTheme(t){ try{ localStorage.setItem('ss:theme', t); }catch(e){} }
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  document.querySelectorAll('#themeSwitch button').forEach(b=> b.classList.toggle('on', b.dataset.theme===t));
  saveTheme(t);
}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(showToast._tm);
  showToast._tm=setTimeout(()=>t.classList.remove('show'),2200);
}
function uid(){ return 't'+Date.now()+Math.random().toString(36).slice(2,7); }
function fmtUSD(v){ v=Number(v)||0; return (v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:2}); }
function fmtR(v){ v=Number(v)||0; if(Math.abs(v)<0.05) return '0R'; return (v>0?'+':'')+v.toFixed(1)+'R'; }

/* The whole app is anchored to New York (killzones), so "today" must be the
   New York calendar day — not the browser's UTC day. */
function todayNY(){ const p = tzInfo(new Date(), NY_TZ); return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`; }
function shiftISO(iso, days, months){
  const d = new Date(iso+'T00:00:00');
  if(days) d.setDate(d.getDate()+days);
  if(months) d.setMonth(d.getMonth()+months);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

/* ============================================================
   STATE
============================================================ */
let trades = [];
let settings = { initialBalance:10000, commissionPerLot:5 };
let editingTradeId = null;
let standaloneChecklistState = { standard:{} };
let formChecklistState = {};

/* date -> trades[] index, rebuilt whenever the list changes. The calendar used
   to filter the whole array once per day cell (≈730 full scans for a year). */
let tradesByDate = new Map();
function rebuildIndex(){
  tradesByDate = new Map();
  for(const t of trades){
    const k = t.date || '';
    if(!tradesByDate.has(k)) tradesByDate.set(k, []);
    tradesByDate.get(k).push(t);
  }
}
async function commitTrades(){ rebuildIndex(); const localOk = saveTrades(trades); const cloudOk = await scheduleAutoSync(); return localOk && cloudOk; }
function refreshAll(){ populateFilters(); renderTradesList(); renderDashboard(); renderCalendar(); renderAccountPreview(); }

function calcCommission(t){ return (Number(t.lotSize)||0) * (Number(settings.commissionPerLot)||0); }
function calcNet(t){ return (Number(t.grossPL)||0) - calcCommission(t); }
function calcBalance(){ return (Number(settings.initialBalance)||0) + trades.reduce((s,t)=>s+calcNet(t),0); }

/* Old-format trades (planned RR, entry/exit time, old checklist keys) are upgraded on load. */
function migrateTrade(t){
  const m = { ...t };
  const v = Number(m.v) || 0;
  m.symbol = SYMBOL;
  if(!m.id) m.id = uid();
  if(!m.result) m.result = Number(m.rr)>0 ? 'win' : (Number(m.rr)<0 ? 'loss' : 'be');
  m.rr = Number(m.rr)||0;
  /* Pre-v4 files stored every loss as exactly -1R, so only those get the
     default. From v4 on the stored value is trusted. */
  if(v < SCHEMA_VERSION && m.result==='loss' && m.rr >= 0) m.rr = -1;
  if(m.result==='win')  m.rr = Math.abs(m.rr);
  if(m.result==='loss') m.rr = -Math.abs(m.rr) || -1;
  if(m.result==='be')   m.rr = 0;
  m.v = SCHEMA_VERSION;
  if(!m.createdAt) m.createdAt = Date.parse((m.date||'1970-01-01')+'T12:00:00') || 0;

  if(!KZ_OPTIONS.includes(m.killzone)) m.killzone = 'Out of Killzone';
  if(!m.trend) m.trend = m.direction==='sell' ? 'bearish' : 'bullish';
  if(m.setupId && !SETUPS[m.setupId]) m.legacySetupId=m.legacySetupId||m.setupId;
  if(!m.setupId || !SETUPS[m.setupId]) m.setupId = 'standard';
  const c = m.checklist || {};
  m.checklist = {
    ...c, withCrt:!c.withoutCrt && !!(c.withCrt || c.crt || c.box || c.crt_box), withoutCrt:!!c.withoutCrt,
    entryCisd:!!(c.ifvg && c.entryCisd), pullbackCisd:!!c.pullbackCisd,
    bsl: !!(c.bsl || c.bsl_sweep), ssl: !!(c.ssl || c.ssl_sweep),
    fvg: !!(c.fvg || c.fvg_hit), ob: !!(c.ob || c.ob_hit),
    crt: !!(c.crt || c.crt_box), box: !!c.box,
    cisd: !!c.cisd, mss: !!c.mss,
    ob50: !!(c.ob50 || c.stopraid || c.price_50 || c.fibo_50),

    leg_strong: !!c.leg_strong, leg_fvg: !!c.leg_fvg, m15_cisd: !!c.m15_cisd, ifvg: !!c.ifvg,
    followThrough: !!c.followThrough,
    sr: !!(c.sr || (c.followThrough && c.stopraid)),
    breakob: !!(c.breakob || c.ob_broken)
  };
  if(m.links){ m.links = { '15': m.links['15']||'', '1': m.links['1']||'' }; }
  else m.links = { '15':'', '1':'' };
  delete m.rrPlanned;  delete m.entryPoint;
  return m;
}

/* ============================================================
   TABS
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

/* ============================================================
   SEGMENTED BUTTONS
============================================================ */
function syncSegAria(el){
  el.querySelectorAll('button').forEach(b=> b.setAttribute('aria-pressed', b.classList.contains('on')?'true':'false'));
}
function initSeg(id, onChange){
  const el = document.getElementById(id);
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
   KILLZONE BAR — New York time
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
/* The pills are built once; the ticker only touches text nodes and classes.
   Rewriting innerHTML every second killed the CSS transitions and burned
   battery on mobile. */
let kzPillEls = null;
function buildKillzoneBar(){
  const wrap = document.getElementById('kzPills');
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
  document.getElementById('kzClock').textContent = `${pad2(ny.hour)}:${pad2(ny.minute)}:${pad2(ny.second)}`;

  const nowTs = now.getTime();
  let anyActive = false;

  KILLZONES.forEach((z,i)=>{
    const startTs = nyLocalToInstant(now, z.h1, z.m1);
    const endTs   = nyLocalToInstant(now, z.h2, z.m2);
    const pill = kzPillEls[i];
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
    if(d.textContent !== detail) d.textContent = detail;
  });

  kzPillEls[kzPillEls.length-1].classList.toggle('active', !anyActive);
}

let kzTimer = null;
function startKzTicker(){ if(!kzTimer){ renderKillzoneBar(); kzTimer = setInterval(renderKillzoneBar, 1000); } }
function stopKzTicker(){ if(kzTimer){ clearInterval(kzTimer); kzTimer = null; } }
document.addEventListener('visibilitychange', ()=> document.hidden ? stopKzTicker() : startKzTicker());
startKzTicker();

/* The sticky sidebar used to assume a fixed 56px bar; it wraps on mobile. */
(function(){
  const bar = document.querySelector('.kz-bar');
  const apply = ()=> document.documentElement.style.setProperty('--kzh', bar.offsetHeight+'px');
  if(window.ResizeObserver) new ResizeObserver(apply).observe(bar);
  window.addEventListener('resize', apply);
  apply();
})();

function currentKillzone(){
  const now=new Date(), ts=now.getTime();
  for(const z of KILLZONES){
    if(ts>=nyLocalToInstant(now,z.h1,z.m1) && ts<nyLocalToInstant(now,z.h2,z.m2)) return z.label;
  }
  return 'Out of Killzone';
}

/* ============================================================
   CHECKLIST RENDERING (compact)
============================================================ */
/* Which help panels are expanded — kept outside the trade/state objects since
   it's a pure UI preference, not something that should be saved with a trade. */
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

function isolateLabel(s){ return esc(s).replace(/[A-Za-z]+(?:\/[A-Za-z]+)*/g, v=>'<bdi dir="ltr">'+v+'</bdi>'); }
function renderChecklistBlocks(steps, state, ns){
  state = state || {};
  ns = ns || 'default';
  return steps.map(step=>{
    let head, body, skipped = false;
    if(step.type==='conditional'){
      skipped = step.skipIfKey && !!state[step.skipIfKey];
      head = `
        <div class="cl-head">
          <span class="cl-n en">${step.n}</span>
          <span class="cl-t">${isolateLabel(step.title)} <i class="en">${step.tf}</i></span>
          ${helpBtn(step, ns)}
        </div>`;
      if(skipped){
        body = `<div class="chips"><span class="cl-skip">${step.skipLabel||'غیرضروری'}</span></div>`;
      } else {
        const ft = !!state[step.followKey];
        const cond = !!state[step.condKey];
        body = `
        <div class="chips">
          <button type="button" class="chip en ${ft?'on':''}" data-follow-key="${step.followKey}">${step.followLabel}</button>
          <button type="button" class="chip en ${cond?'on':''}" data-cond-key="${step.condKey}" data-follow-key="${step.followKey}" ${ft?'':'disabled'}>${step.condLabel}</button>
        </div>`;
      }
    } else {
      head = `
        <div class="cl-head">
          <span class="cl-n en">${step.n}</span>
          <span class="cl-t">${isolateLabel(step.title)} <i class="en">${step.tf}</i></span>
          ${helpBtn(step, ns)}
        </div>`;
      body = `
        <div class="chips">
          ${step.items.map(it=>`<button type="button" class="chip ${it.en?'en':''} ${state[it.key]?'on':''}" aria-pressed="${!!state[it.key]}" ${it.requires&&!state[it.requires]?'disabled':''} data-key="${it.key}" data-group="${step.n}" data-multi="${step.multi?1:0}">${it.label}</button>`).join('')}
        </div>`;
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
        step.items.forEach(it=> state[it.key]=false);
      }
      const item = steps.flatMap(s=>s.items||[]).find(it=>it.key===key);
      if(item?.requires && !state[item.requires]) return;
      state[key] = !isOn;
      if(key==='ifvg' && !state.ifvg) state.entryCisd=false;
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
   TRADE FORM
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
  const steps = getSetup(formSetupId).steps;
  el.innerHTML = renderChecklistBlocks(steps, formChecklistState, 'form:'+formSetupId);
  wireChecklist(el, steps, formChecklistState, renderFormChecklist);
}
function buildFormChecklist(setupId, checked){ formSetupId = SETUPS[setupId] ? setupId : 'standard'; formChecklistState = { ...(checked||{}) }; renderFormChecklist(); }

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
  /* a win's 2.5R must not silently become a 2.5R loss */
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
  document.getElementById('segKillzone').querySelectorAll('[data-legacy]').forEach(b=>b.remove());
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
  const kzGroup=document.getElementById('segKillzone');
  kzGroup.querySelectorAll('[data-legacy]').forEach(b=>b.remove());
  if(t.killzone && !['NY AM','NY PM','Out of Killzone'].includes(t.killzone)){ const b=document.createElement('button');b.type='button';b.dataset.val=t.killzone;b.dataset.legacy='1';b.textContent=t.killzone;b.addEventListener('click',()=>setSeg('segKillzone',t.killzone));kzGroup.appendChild(b); }
  setSeg('segKillzone', t.killzone||'Out of Killzone');
  applyResultUI();
  document.getElementById('f-rr').value = t.result==='be' ? '' : Math.abs(Number(t.rr)||0);
  document.getElementById('f-idealrr').value = t.idealRR ?? '';
  document.getElementById('f-entryTime').value=t.entryTime||'';
  document.getElementById('f-duration').value=t.durationMinutes??'';
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

document.getElementById('tradeForm').addEventListener('submit', async e=>{
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
    idealRR: document.getElementById('f-idealrr').value===''?null:Number(document.getElementById('f-idealrr').value),
    entryTime:document.getElementById('f-entryTime').value,
    durationMinutes:document.getElementById('f-duration').value===''?null:Number(document.getElementById('f-duration').value),
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
  const ok = await commitTrades();
  document.getElementById('tradeFormPanel').classList.add('hidden');
  editingTradeId = null;
  refreshAll();
  showToast(ok ? 'معامله ذخیره شد ✓' : 'در سرور ذخیره نشد — دوباره تلاش کن (اتصال اینترنت را چک کن)');
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
      <div class="trade-row" data-id="${esc(t.id)}" role="button" tabindex="0" aria-expanded="false"
           aria-label="${esc(t.date||'')} ${t.direction==='buy'?'Buy':'Sell'} ${t.result}">
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
    row.addEventListener('keydown', e=>{
      if(e.key==='Enter' || e.key===' '){ e.preventDefault(); toggleTradeCard(row.dataset.id); }
    });
  });
}
function toggleTradeCard(id){
  const card = document.getElementById('card-'+id);
  const isOpen = card.classList.contains('open');
  document.querySelectorAll('.trade-card.open').forEach(c=>{
    if(c!==card){ c.classList.remove('open'); c.querySelector('.trade-row').setAttribute('aria-expanded','false'); }
  });
  card.classList.toggle('open', !isOpen);
  card.querySelector('.trade-row').setAttribute('aria-expanded', String(!isOpen));
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
    <div class="detail-cl"><span class="cl-setup-badge" style="background:${getSetup(t.setupId).accent==='amber'?'#d99a1e':(getSetup(t.setupId).accent==='red'?'var(--red)':'var(--blue)')}">${getSetup(t.setupId).label}</span>${getSetup(t.setupId).steps.map(step=>{
      if(step.type==='conditional'){
        const done = stepDone(step,t.checklist||{});
        const ft = t.checklist && t.checklist[step.followKey];
        const cond = t.checklist && t.checklist[step.condKey];
        const label = ft ? (cond? `${step.title} (${step.condLabel} ✓)` : `${step.title} (${step.condLabel} —)`) : `${step.title} (بدون Follow Through)`;
        return `<span class="${done?'done':''}">${done?'✓':'—'} ${step.n}. ${label}</span>`;
      }
      const picked = step.items.filter(it=>t.checklist && t.checklist[it.key]);
      const done = picked.length>0;
      const label = step.items.length>1 && picked.length ? picked.map(p=>p.label).join(' + ') : step.title;
      return `<span class="${done?'done':''}">${done?'✓':'—'} ${step.n}. ${label}</span>`;
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
    const open = ()=> window.open(s.dataset.url,'_blank','noopener');
    s.addEventListener('click', open);
    s.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
  });
  inner.querySelector('[data-edit]').addEventListener('click', e=>{ e.stopPropagation(); openEditForm(t); });
  inner.querySelector('[data-del]').addEventListener('click', async e=>{
    e.stopPropagation();
    if(!confirm('این معامله حذف شود؟')) return;
    trades = trades.filter(x=>x.id!==id);
    const ok = await commitTrades();
    refreshAll();
    showToast(ok ? 'معامله حذف شد' : 'حذف محلی انجام شد ولی هم‌گام‌سازی با سرور ناموفق بود');
  });
}
['filterKillzone','filterDirection','filterResult'].forEach(id=>{
  document.getElementById(id).addEventListener('change', renderTradesList);
});

/* ============================================================
   DASHBOARD
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
  const sorted = [...list].sort((a,b)=> new Date(a.date)-new Date(b.date) || String(a.entryTime||'').localeCompare(String(b.entryTime||'')) || (a.createdAt||0)-(b.createdAt||0));
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
/* ---------- Profit & loss panel (new, matches reference screenshots) ---------- */
let pnlRange = 'all';
function effResult(t){ const threshold=Number(document.getElementById('beThreshold')?.value)||0;return threshold>0&&Math.abs(calcNet(t))<=threshold?'be':t.result; }
function chronological(list){
  return [...list].sort((a,b)=> new Date(a.date)-new Date(b.date) || String(a.entryTime||'').localeCompare(String(b.entryTime||'')) || (a.createdAt||0)-(b.createdAt||0));
}
function annotateWithBalance(list){
  const sorted = chronological(list);
  let bal = Number(settings.initialBalance)||0;
  return sorted.map(t=>{
    const net = calcNet(t);
    const before = bal;
    bal += net;
    const pct = before ? (net/before*100) : (net>0?100:(net<0?-100:0));
    return { t, net, before, after:bal, pct, eff: effResult(t) };
  });
}
/* Ranges are based on the DATE OF THE TRADE, not on when the row happened to be
   typed in. The old version filtered on createdAt, so back-filled and imported
   trades landed in the wrong bucket (or in none at all). */
const RANGE_LABELS = { all:'کل دوره', '7d':'۷ روز اخیر', '30d':'۳۰ روز اخیر', '3m':'۳ ماه اخیر', ytd:'از ابتدای سال' };
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
function fmtCompact(v){
  const sign = v<0?'-':'';
  const av = Math.abs(v);
  if(av>=1000) return sign+(av/1000).toFixed(1)+'k';
  return sign+av.toFixed(0);
}
function fmtDateShort(d){
  if(!d) return '';
  const dt = new Date(d+'T00:00:00');
  if(isNaN(dt)) return '';
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return dt.getDate()+' '+months[dt.getMonth()];
}

function renderPnlStats(ann){
  const row = document.getElementById('pnlStatsRow');
  if(!ann.length){ row.innerHTML = ''; return; }
  const totalNet = ann.reduce((s,a)=>s+a.net,0);
  const initial = Number(settings.initialBalance)||0;
  /* TOTAL PNL was range-filtered while ACCOUNT BALANCE was always all-time, so
     the two numbers contradicted each other on every range but "All". */
  const bal = ann.length ? ann[ann.length-1].after : calcBalance();
  const balLabel = pnlRange==='all' ? 'ACCOUNT BALANCE' : 'BALANCE AT RANGE END';
  const balPct = initial ? ((bal-initial)/initial*100) : (bal>0?100:0);
  const baseForPct = ann.length ? ann[0].before : initial;
  const totalPct = baseForPct ? (totalNet/baseForPct*100) : (totalNet>0?100:0);

  const wins = ann.filter(a=>a.eff==='win').length;
  const losses = ann.filter(a=>a.eff==='loss').length;
  const bes = ann.filter(a=>a.eff==='be').length;
  const decided = wins+losses;
  const winRate = decided ? wins/decided*100 : 0;

  row.innerHTML = `
    <div class="pnl-stat">
      <span class="lbl en">TOTAL PNL</span>
      <span class="val ${totalNet>=0?'pos':'neg'} en">${fmtUSD(totalNet)}<span class="pct">${totalNet>=0?'+':''}${totalPct.toFixed(2)}%</span></span>
    </div>
    <div class="pnl-stat">
      <span class="lbl en">${balLabel}</span>
      <span class="val ${bal>=initial?'pos':'neg'} en">${fmtUSD(bal)}<span class="pct">${bal>=initial?'+':''}${balPct.toFixed(2)}%</span></span>
    </div>
    <div class="pnl-stat">
      <span class="lbl en">WIN RATE</span>
      <span class="val en">${decided?winRate.toFixed(2)+'%':'—'}</span>
    </div>
    <div class="pnl-stat">
      <span class="lbl en">TOTAL TRADES</span>
      <span class="val en">${ann.length}<small>${wins}/${losses}</small></span>
    </div>
    <div class="pnl-stat">
      <span class="lbl en">BREAKEVEN TRADES</span>
      <span class="val en">${bes}</span>
    </div>
  `;
}

/* Redraws on container resize so the SVG viewBox always matches real pixels.
   The old chart used preserveAspectRatio="none", which stretched the stroke and
   turned the data dots into ellipses, and it dropped the starting balance so
   the curve began after the first trade instead of at it. */
let eqData = [];
let eqObserver = null;

function renderEquityCurve(ann){
  eqData = ann;
  drawEquityCurve();
  const wrap = document.getElementById('equityWrap');
  if(window.ResizeObserver && !eqObserver){
    eqObserver = new ResizeObserver(()=>{ clearTimeout(drawEquityCurve._t); drawEquityCurve._t = setTimeout(drawEquityCurve, 60); });
    eqObserver.observe(wrap);
  }
}

function drawEquityCurve(){
  const ann = eqData;
  const wrap = document.getElementById('equityWrap');
  if(!ann.length){ wrap.innerHTML = `<div class="eq-empty">هنوز معامله‌ای در این بازه ثبت نشده.</div>`; return; }

  const h = 200, pad = 14, padLeft = 44;
  const w = Math.max(240, wrap.clientWidth - padLeft);

  /* node 0 is the balance before the first trade in range */
  const nodes = [{ v: ann[0].before, label: 'شروع بازه', date: ann[0].t.date, net: null, i: -1 }]
    .concat(ann.map((a,i)=>({ v:a.after, label:null, date:a.t.date, net:a.net, r:Number(a.t.rr)||0, res:a.eff, i })));

  const vals = nodes.map(n=>n.v);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const span = (maxV-minV) || Math.max(1, Math.abs(maxV)*0.02);
  const lo = minV - span*0.08, hi = maxV + span*0.08, range = hi-lo;

  const stepX = nodes.length>1 ? (w-2*pad)/(nodes.length-1) : 0;
  const toX = i => pad + i*stepX;
  const toY = v => h-pad - ((v-lo)/range)*(h-2*pad);
  const coords = nodes.map((n,i)=>[toX(i), toY(n.v)]);

  const line = coords.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = line+` L${coords[coords.length-1][0].toFixed(1)},${(h-pad).toFixed(1)} L${pad.toFixed(1)},${(h-pad).toFixed(1)} Z`;

  const ticks = 4;
  const yLabels = Array.from({length:ticks+1},(_,i)=> fmtCompact(hi-(i*(range/ticks))));

  const maxLabels = Math.max(2, Math.min(6, Math.floor(w/95)));
  const idxs = [...new Set(Array.from({length:maxLabels},(_,k)=> Math.round(k*(nodes.length-1)/(maxLabels-1))))];

  const initial = Number(settings.initialBalance)||0;
  const baseY = (initial>=lo && initial<=hi) ? toY(initial) : null;

  wrap.innerHTML = `
    <div class="eq-chart-wrap" id="eqWrapInner">
      <div class="eq-ylabels">${yLabels.map(l=>`<span>${esc(l)}</span>`).join('')}</div>
      <svg class="equity" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Equity curve">
        <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--blue)" stop-opacity=".28"/>
          <stop offset="100%" stop-color="var(--blue)" stop-opacity="0"/>
        </linearGradient></defs>
        <g class="eq-grid">${Array.from({length:ticks+1},(_,i)=>{ const y=pad+i*((h-2*pad)/ticks); return `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${(w-pad).toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('')}</g>
        ${baseY!==null?`<line class="eq-zero" x1="${pad}" y1="${baseY.toFixed(1)}" x2="${(w-pad).toFixed(1)}" y2="${baseY.toFixed(1)}"/>`:''}
        <path class="eq-area" d="${area}"/>
        <path class="eq-line" d="${line}"/>
        ${coords.map(p=>`<circle class="eq-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${nodes.length>90?1.8:3.2}"/>`).join('')}
      </svg>
      <div class="eq-cursor" id="eqCursor"></div>
      <div class="eq-marker" id="eqMarker"></div>
      <div class="eq-tip" id="eqTip"></div>
      <div class="eq-hit" id="eqHit"></div>
    </div>
    <div class="eq-xlabels" style="margin-inline-start:${padLeft}px;">
      ${idxs.map(i=>`<span style="left:${((toX(i)/w)*100).toFixed(2)}%">${esc(fmtDateShort(nodes[i].date))}</span>`).join('')}
    </div>
  `;

  /* hover readout */
  const hit = document.getElementById('eqHit');
  const cur = document.getElementById('eqCursor');
  const mk  = document.getElementById('eqMarker');
  const tip = document.getElementById('eqTip');
  const inner = document.getElementById('eqWrapInner');

  function pick(clientX){
    const box = hit.getBoundingClientRect();
    const x = clientX - box.left;
    const i = Math.max(0, Math.min(nodes.length-1, Math.round((x-pad)/(stepX||1))));
    const n = nodes[i];
    const px = toX(i), py = toY(n.v);
    cur.style.left = px+'px'; cur.classList.add('on');
    mk.style.left = px+'px'; mk.style.top = py+'px'; mk.classList.add('on');
    tip.style.left = Math.max(60, Math.min(w-60, px))+'px';
    tip.style.top = py+'px';
    tip.innerHTML = n.net===null
      ? `<div>${esc(fmtUSD(n.v))}</div><div style="opacity:.7">شروع بازه</div>`
      : `<div>${esc(fmtDateShort(n.date))} · ${esc(fmtR(n.r))}</div>`+
        `<div>${n.net>=0?'+':''}${esc(fmtUSD(n.net))} → ${esc(fmtUSD(n.v))}</div>`;
    tip.classList.add('on');
  }
  function clear(){ cur.classList.remove('on'); mk.classList.remove('on'); tip.classList.remove('on'); }

  hit.addEventListener('mousemove', e=> pick(e.clientX));
  hit.addEventListener('mouseleave', clear);
  hit.addEventListener('touchstart', e=>{ if(e.touches[0]) pick(e.touches[0].clientX); }, {passive:true});
  hit.addEventListener('touchmove',  e=>{ if(e.touches[0]) pick(e.touches[0].clientX); }, {passive:true});
  hit.addEventListener('touchend', clear);
  inner.style.position = 'relative';
}

function rrMiniCard(k1,k2,v1,v2,series){
  const w=220,h=38,pad=3;
  const s = series.length? series : [0];
  const min=Math.min(0,...s), max=Math.max(0,...s), range=(max-min)||1;
  const stepX = s.length>1 ? (w-2*pad)/(s.length-1) : 0;
  const toY = v => h-pad-((v-min)/range)*(h-2*pad);
  const pts = s.map((v,i)=>[pad+i*stepX, toY(v)]);
  const path = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const dots = s.length<=40 ? pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.6" vector-effect="non-scaling-stroke"/>`).join('') : '';
  return `
    <div class="rr-mini">
      <div class="rr-head">
        <div class="rr-item"><span class="k en">${k1}</span><span class="v en">${v1}</span></div>
        <div class="rr-item right"><span class="k en">${k2}</span><span class="v en">${v2}</span></div>
      </div>
      <svg class="rr-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path class="rl" d="${path}" vector-effect="non-scaling-stroke"/>${dots}</svg>
    </div>`;
}
function renderRRMini(ann){
  const grid = document.getElementById('rrMiniGrid');
  if(!ann.length){ grid.innerHTML=''; return; }
  const rrs = ann.map(a=>Number(a.t.rr)||0);
  const avgRR = rrs.reduce((s,v)=>s+v,0)/rrs.length;
  const maxRR = Math.max(...rrs);

  const idealRRs = ann.filter(a=>a.t.idealRR!=null && Number(a.t.idealRR)>0).map(a=>Number(a.t.idealRR));
  const idealAvg = idealRRs.reduce((s,v)=>s+v,0)/idealRRs.length;
  const idealMax = Math.max(...idealRRs);

  const couldList = ann.filter(a=>a.t.couldBeProfitOrBE);
  const couldIdealRRs = couldList.map(a=>Number(a.t.idealRR)||0);
  const couldMaxIdeal = couldIdealRRs.length ? Math.max(...couldIdealRRs) : 0;

  grid.innerHTML =
    rrMiniCard('Average RR','Max RR', avgRR.toFixed(2), maxRR.toFixed(2), rrs) +
    rrMiniCard('Ideal Average RR','Max Ideal RR', idealRRs.length?idealAvg.toFixed(2):'—', idealRRs.length?idealMax.toFixed(2):'—', idealRRs) +
    rrMiniCard('Could have profit/BE','Max Ideal RR', couldList.length, couldIdealRRs.some(v=>v>0)?couldMaxIdeal.toFixed(2):'—', couldIdealRRs);
}

function renderExpectancy(ann){
  const el = document.getElementById('expGrid');
  if(!ann.length){ el.innerHTML = `<div class="empty-state"><p>داده‌ای نیست.</p></div>`; return; }
  const winners = ann.filter(a=>a.eff==='win');
  const losers = ann.filter(a=>a.eff==='loss');
  const decided = winners.length+losers.length;
  const winRateDec = decided? winners.length/decided : 0;
  const avgWinUSD = winners.length ? winners.reduce((s,a)=>s+a.net,0)/winners.length : 0;
  const avgLossUSD = losers.length ? losers.reduce((s,a)=>s+a.net,0)/losers.length : 0;
  const expectancy = ann.reduce((s,a)=>s+a.net,0)/ann.length;

  const grossProfit = ann.filter(a=>a.net>0).reduce((s,a)=>s+a.net,0);
  const grossLoss = Math.abs(ann.filter(a=>a.net<0).reduce((s,a)=>s+a.net,0));
  const hasLosses = grossLoss > 0;
  const profitFactor = hasLosses ? grossProfit/grossLoss : (grossProfit>0 ? Infinity : 0);
  const pfText = !hasLosses ? (grossProfit>0 ? '∞' : '—') : profitFactor.toFixed(2);

  const barTotal = (avgWinUSD + Math.abs(avgLossUSD)) || 1;
  const gPct = Math.max(4, avgWinUSD/barTotal*100);
  const rPct = Math.max(0, 100-gPct);

  const ringFrac = hasLosses ? Math.max(0, Math.min(1, profitFactor/5)) : (grossProfit>0 ? 1 : 0);
  const r=30, c=2*Math.PI*r, dash=c*ringFrac;

  el.innerHTML = `
    <div class="exp-card">
      <span class="k en">EXPECTANCY</span>
      <div class="v ${expectancy>=0?'pos':'neg'}">${fmtUSD(expectancy)}</div>
      <div class="exp-bar-track"><span class="g" style="width:${gPct}%"></span><span class="r" style="width:${rPct}%"></span></div>
      <div class="exp-bar-labels"><span class="g">${fmtUSD(avgWinUSD)}</span><span class="r">${fmtUSD(avgLossUSD)}</span></div>
    </div>
    <div class="pf-card">
      <div>
        <span class="k en">PROFIT FACTOR</span>
        <div class="v">${pfText}</div>
      </div>
      <div class="pf-ring-wrap">
        <svg viewBox="0 0 74 74">
          <circle class="pf-ring-bg" cx="37" cy="37" r="${r}"/>
          <circle class="pf-ring-fg" cx="37" cy="37" r="${r}" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}"/>
        </svg>
      </div>
    </div>
  `;
}

function streaksInfo(list, key){
  let cur=0; const streaks=[];
  list.forEach(a=>{
    if(a.eff===key){ cur++; }
    else if(a.eff!=='be'){ if(cur>0) streaks.push(cur); cur=0; }
  });
  if(cur>0) streaks.push(cur);
  const max = streaks.length? Math.max(...streaks) : 0;
  const avg = streaks.length? streaks.reduce((s,v)=>s+v,0)/streaks.length : 0;
  return { max, avg };
}
function renderWinnersLosers(ann){
  const el = document.getElementById('wlGrid');
  if(!ann.length){ el.innerHTML = `<div class="empty-state"><p>داده‌ای نیست.</p></div>`; return; }
  const winners = ann.filter(a=>a.eff==='win');
  const losers = ann.filter(a=>a.eff==='loss');

  const bestWinUSD = winners.length? Math.max(...winners.map(a=>a.net)) : 0;
  const worstLossUSD = losers.length? Math.min(...losers.map(a=>a.net)) : 0;
  const avgWinUSD = winners.length? winners.reduce((s,a)=>s+a.net,0)/winners.length : 0;
  const avgLossUSD = losers.length? losers.reduce((s,a)=>s+a.net,0)/losers.length : 0;

  const wStreak = streaksInfo(ann,'win');
  const lStreak = streaksInfo(ann,'loss');

  el.innerHTML = `
    <div class="wl-card win">
      <h4 class="en">Winners</h4>
      <div class="wl-row"><span>Total winners</span><b>${winners.length}</b></div>
      <div class="wl-row"><span>Best win</span><b>${fmtUSD(bestWinUSD)}</b></div>
      <div class="wl-row"><span>Average win</span><b>${fmtUSD(avgWinUSD)}</b></div>
      <div class="wl-row"><span>Max consecutive wins</span><b>${wStreak.max}</b></div>
      <div class="wl-row"><span>Avg consecutive wins</span><b>${wStreak.avg.toFixed(2)}</b></div>
    </div>
    <div class="wl-card loss">
      <h4 class="en">Losers</h4>
      <div class="wl-row"><span>Total losers</span><b>${losers.length}</b></div>
      <div class="wl-row"><span>Worst loss</span><b>${fmtUSD(worstLossUSD)}</b></div>
      <div class="wl-row"><span>Average loss</span><b>${fmtUSD(avgLossUSD)}</b></div>
      <div class="wl-row"><span>Max consecutive losses</span><b>${lStreak.max}</b></div>
      <div class="wl-row"><span>Avg consecutive losses</span><b>${lStreak.avg.toFixed(2)}</b></div>
    </div>
  `;
}

const pnlRangeSegEl = document.getElementById('pnlRangeSeg');
pnlRangeSegEl.addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  pnlRangeSegEl.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  syncSegAria(pnlRangeSegEl);
  pnlRange = b.dataset.range;
  renderDashboard();
});

function renderDashboard(){
  renderStatGrid();
  const ann = computeAnnotated();
  const hint = document.querySelector('.pnl-panel .hint');
  if(hint) hint.textContent = RANGE_LABELS[pnlRange] || 'Over time';
  renderPnlStats(ann);
  renderEquityCurve(aggregateEquity(ann));
  renderRRMini(ann);
  renderExpectancy(ann);
  renderWinnersLosers(ann);
  renderPerformance(ann);
  if(!ann.length){ document.getElementById('statGridPerf').innerHTML='';document.getElementById('statGridAccount').innerHTML=''; }
}

/* ============================================================
   PNL CALENDAR
============================================================ */
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
let calState = { year: Number(todayNY().slice(0,4)), month: Number(todayNY().slice(5,7))-1, mode:'usd', balanceMode:'initial', view:'month' };

function dayKey(y,m,d){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function fmtPct(v){ v=Number(v)||0; return (v>=0?'+':'')+v.toFixed(2)+'%'; }

function dayStats(dateStr){
  const list = tradesByDate.get(dateStr) || [];
  const n = list.length;
  const wins = list.filter(t=>t.result==='win').length;
  const losses = list.filter(t=>t.result==='loss').length;
  const decided = wins+losses;
  const netUSD = list.reduce((s,t)=>s+calcNet(t),0);
  const totalR = list.reduce((s,t)=>s+Number(t.rr||0),0);
  return { n, wins, losses, netUSD, totalR, winRate: decided ? wins/decided*100 : null };
}
function monthAggregateStats(y, idx){
  const daysInM = new Date(y, idx+1, 0).getDate();
  let n=0, netUSD=0, totalR=0, wins=0, losses=0;
  for(let d=1; d<=daysInM; d++){
    const s = dayStats(dayKey(y, idx, d));
    n+=s.n; netUSD+=s.netUSD; totalR+=s.totalR; wins+=s.wins; losses+=s.losses;
  }
  const decided = wins+losses;
  return { n, wins, losses, netUSD, totalR, winRate: decided ? wins/decided*100 : null };
}
function calDayValue(stats){
  if(calState.mode==='r') return stats.totalR;
  if(calState.mode==='pct'){
    const base = calState.balanceMode==='current' ? calcBalance() : (Number(settings.initialBalance)||0);
    return base ? (stats.netUSD/base*100) : 0;
  }
  return stats.netUSD;
}
function calFmtValue(v){
  if(calState.mode==='r') return fmtR(v);
  if(calState.mode==='pct') return fmtPct(v);
  return fmtUSD(v);
}
function shiftMonth(delta){
  let m = calState.month + delta, y = calState.year;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  calState.month = m; calState.year = y;
  renderCalendar();
}
function shiftYear(delta){ calState.year += delta; renderCalendar(); }
function jumpToday(){ const d=todayNY(); calState.year=Number(d.slice(0,4)); calState.month=Number(d.slice(5,7))-1; calState.view='month'; setSeg('calViewSeg','month'); renderCalendar(); }

function renderCalendarSummary(statsList){
  const totalTrades = statsList.reduce((s,x)=>s+x.n,0);
  const totalNet = statsList.reduce((s,x)=>s+x.netUSD,0);
  const totalR = statsList.reduce((s,x)=>s+x.totalR,0);
  const wins = statsList.reduce((s,x)=>s+x.wins,0);
  const losses = statsList.reduce((s,x)=>s+x.losses,0);
  const decided = wins+losses;
  const winRate = decided ? wins/decided*100 : 0;
  const tradingDays = statsList.filter(x=>x.n>0).length;
  const withTrades = statsList.filter(x=>x.n>0);
  const bestDay = withTrades.length ? Math.max(...withTrades.map(x=>x.netUSD)) : 0;
  const worstDay = withTrades.length ? Math.min(...withTrades.map(x=>x.netUSD)) : 0;

  document.getElementById('calSummary').innerHTML = `
    <div class="stat-card"><div class="lbl">TOTAL PNL</div><div class="val ${totalNet>=0?'pos':'neg'} en">${fmtUSD(totalNet)}</div><div class="sub en">${fmtR(totalR)}</div></div>
    <div class="stat-card"><div class="lbl">WIN RATE</div><div class="val ${winRate>=50?'pos':'neg'} en">${winRate.toFixed(0)}%</div><div class="sub en">${wins}W · ${losses}L</div></div>
    <div class="stat-card"><div class="lbl">TRADES</div><div class="val en">${totalTrades}</div><div class="sub">${tradingDays} روز معاملاتی</div></div>
    <div class="stat-card"><div class="lbl">BEST / WORST DAY</div><div class="val pos en" style="font-size:15px;">${fmtUSD(bestDay)}</div><div class="sub neg en" style="font-weight:600;">${fmtUSD(worstDay)}</div></div>
  `;
}

function updateCalNavVisibility(){
  const isYear = calState.view==='year';
  document.getElementById('calPrevMonth').style.display = isYear ? 'none' : '';
  document.getElementById('calNextMonth').style.display = isYear ? 'none' : '';
  document.getElementById('calWeekdays').style.display = isYear ? 'none' : '';
  document.getElementById('calGrid').style.display = isYear ? 'none' : '';
  document.getElementById('calYearGrid').style.display = isYear ? '' : 'none';
}

function renderMonthGrid(){
  const y = calState.year, m = calState.month;
  document.getElementById('calMonthLabel').textContent = MONTHS_EN[m] + ' ' + y;

  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const leading = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first offset

  const cells = [];
  for(let i=leading-1;i>=0;i--){
    const d = daysInPrevMonth - i;
    let pm=m-1, py=y; if(pm<0){ pm=11; py--; }
    cells.push({ dateStr: dayKey(py,pm,d), day:d, inMonth:false });
  }
  for(let d=1; d<=daysInMonth; d++) cells.push({ dateStr: dayKey(y,m,d), day:d, inMonth:true });
  let next=1, nm=m+1, ny=y; if(nm>11){ nm=0; ny++; }
  while(cells.length % 7 !== 0){ cells.push({ dateStr: dayKey(ny,nm,next), day:next, inMonth:false }); next++; }

  renderCalendarSummary(cells.filter(c=>c.inMonth).map(c=>dayStats(c.dateStr)));

  const todayStr = todayNY();

  document.getElementById('calGrid').innerHTML = cells.map(c=>{
    const stats = dayStats(c.dateStr);
    const hasT = stats.n>0;
    const val = calDayValue(stats);
    const cls = ['cal-cell'];
    if(!c.inMonth) cls.push('out');
    if(hasT) cls.push('has-trades', val>=0?'pos':'neg');
    if(c.dateStr===todayStr) cls.push('today');
    return `<div class="${cls.join(' ')}">
      <div class="cal-daynum en">${c.day}</div>
      ${hasT ? `
        <div class="cal-trades en">${stats.n} ${stats.n===1?'trade':'trades'}</div>
        <div class="cal-pl ${val>=0?'pos':'neg'} en">${calFmtValue(val)}</div>
        <div class="cal-wr en">${stats.winRate===null?'—':stats.winRate.toFixed(0)+'% WR'}</div>
      ` : ``}
    </div>`;
  }).join('');
}

function renderYearGrid(){
  const y = calState.year;
  document.getElementById('calMonthLabel').textContent = String(y);
  const monthStats = MONTHS_EN.map((name, idx)=> ({ name, idx, stats: monthAggregateStats(y, idx) }));
  renderCalendarSummary(monthStats.map(ms=>ms.stats));

  document.getElementById('calYearGrid').innerHTML = monthStats.map(ms=>{
    const { n } = ms.stats;
    const val = calDayValue(ms.stats);
    const cls = ['cal-year-cell'];
    if(n>0) cls.push(val>=0?'pos':'neg');
    return `<div class="${cls.join(' ')}" data-month="${ms.idx}">
      <div class="ycm en">${ms.name.slice(0,3)}</div>
      <div class="ycv ${n>0?(val>=0?'pos':'neg'):''} en">${n>0?calFmtValue(val):'—'}</div>
      <div class="yct en">${n} ${n===1?'trade':'trades'}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('#calYearGrid .cal-year-cell').forEach(el=>{
    el.addEventListener('click', ()=>{
      calState.month = Number(el.dataset.month);
      calState.view = 'month';
      setSeg('calViewSeg','month');
      renderCalendar();
    });
  });
}

function renderPerfMonthGrid(){
  const y = calState.year;
  const base = calState.balanceMode==='current' ? calcBalance() : (Number(settings.initialBalance)||0);
  let ytdNet = 0;
  const cellsHtml = MONTHS_EN.map((name, idx)=>{
    const st = monthAggregateStats(y, idx);
    ytdNet += st.netUSD;
    const pct = base ? (st.netUSD/base*100) : 0;
    const valCls = st.n===0 ? 'zero' : (pct>=0?'pos':'neg');
    return `<div class="perf-cell">
      <div class="pm-lbl en">${name.slice(0,3).toUpperCase()}</div>
      <div class="pm-val ${valCls} en">${st.n===0?'–':fmtPct(pct)}</div>
    </div>`;
  }).join('');
  const ytdPct = base ? (ytdNet/base*100) : 0;
  const ytdHtml = `<div class="perf-cell ytd">
    <div class="pm-lbl en">YTD</div>
    <div class="pm-val ${ytdPct>=0?'pos':'neg'} en">${fmtPct(ytdPct)}</div>
  </div>`;
  document.getElementById('perfMonthGrid').innerHTML = cellsHtml + ytdHtml;
  document.getElementById('perfMonthHint').textContent = calState.balanceMode==='current' ? '% OF CURRENT BALANCE' : '% OF INITIAL BALANCE';
}

function renderCalendar(){
  updateCalNavVisibility();
  if(calState.view==='year') renderYearGrid();
  else renderMonthGrid();
  renderPerfMonthGrid();
}

/* ============================================================
   STANDALONE CHECKLIST
============================================================ */
let currentSetupId = 'standard';
function renderSetupPicker(){
  const el = document.getElementById('setupPicker');
  el.innerHTML = SETUP_ORDER.map(id=>{
    const s = SETUPS[id];
    const state = standaloneChecklistState[id] || (standaloneChecklistState[id]={});
    const done = stepsDoneCount(s.steps, state);
    return `<button type="button" class="setup-card accent-${s.accent} ${currentSetupId===id?'active':''}" data-setup="${id}">
        <div class="setup-card-top"><span class="setup-tag en">${s.tag}</span>${done>0?`<span class="setup-progress-pill en">${done}/${s.steps.length}</span>`:''}</div>
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
  if(!currentSetupId){ body.classList.add('hidden'); return; }
  body.classList.remove('hidden');
  const setup = SETUPS[currentSetupId];
  const state = standaloneChecklistState[currentSetupId] || (standaloneChecklistState[currentSetupId]={});
  document.getElementById('clSetupTitle').textContent = setup.label;
  const el = document.getElementById('standaloneChecklist');
  el.innerHTML = renderChecklistBlocks(setup.steps, state, 'standalone:'+currentSetupId);
  wireChecklist(el, setup.steps, state, renderStandaloneChecklist);
  const done = stepsDoneCount(setup.steps, state);
  document.getElementById('clProgressText').textContent = `${done} از ${setup.steps.length} مرحله`;
  document.getElementById('clProgressFill').style.width = (done/setup.steps.length*100)+'%';
}
document.getElementById('clChangeSetupBtn').addEventListener('click', ()=>{ currentSetupId='standard'; renderStandaloneChecklist(); });
document.getElementById('clResetBtn').addEventListener('click', ()=>{
  if(currentSetupId) standaloneChecklistState[currentSetupId] = {};
  renderStandaloneChecklist();
});
document.getElementById('clGoJournalBtn').addEventListener('click', ()=>{
  if(!currentSetupId) return;
  const id = currentSetupId, state = standaloneChecklistState[id];
  goToView('journal');
  resetForm();
  document.getElementById('tradeFormPanel').classList.remove('hidden');
  buildFormChecklist(id, state);
});

/* ============================================================
   ACCOUNT
============================================================ */
function populateAccountFields(){
  document.getElementById('acc-initial').value = settings.initialBalance;
  document.getElementById('acc-commission').value = settings.commissionPerLot;
  const note = document.getElementById('acc-email-note');
  if(note) note.textContent = currentUser ? ('وارد شده با: '+(currentUser.email||'')) : '';
  if(currentUser) setSyncStatus('متصل — '+(currentUser.email||''), 'ok');
  else setSyncStatus('متصل نیست');
  renderAccountPreview();
}
function renderAccountPreview(){
  const initial = Number(document.getElementById('acc-initial').value)||0;
  const commission = Number(document.getElementById('acc-commission').value)||0;
  const netSum = trades.reduce((s,t)=> s + ((Number(t.grossPL)||0) - (Number(t.lotSize)||0)*commission), 0);
  const bal = initial+netSum;
  const el = document.getElementById('acc-balance');
  el.textContent = fmtUSD(bal);
  el.style.color = bal>=initial ? 'var(--blue)' : 'var(--red)';
  document.getElementById('acc-breakdown').textContent = `${fmtUSD(initial)} + ${fmtUSD(netSum)} · ${trades.length} معامله`;
}
document.getElementById('acc-initial').addEventListener('input', renderAccountPreview);
document.getElementById('acc-commission').addEventListener('input', renderAccountPreview);
document.getElementById('saveSettingsBtn').addEventListener('click', async ()=>{
  settings.initialBalance = Number(document.getElementById('acc-initial').value)||0;
  settings.commissionPerLot = Number(document.getElementById('acc-commission').value)||0;
  const localOk = saveSettings(settings);
  updateFormCalcLine(); renderDashboard(); renderCalendar();
  const cloudOk = await scheduleAutoSync();
  refreshAll();
  showToast((localOk && cloudOk) ? 'تنظیمات ذخیره شد ✓' : 'در سرور ذخیره نشد — دوباره تلاش کن');
});

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

/* ============================================================
   MODAL
============================================================ */
function openModal({ title, sub, body, actions }){
  document.getElementById('modalTitle').textContent = title||'';
  document.getElementById('modalSub').textContent = sub||'';
  document.getElementById('modalBody').innerHTML = body||'';
  const act = document.getElementById('modalActions');
  act.innerHTML = '';
  (actions||[]).forEach(a=>{
    const b = document.createElement('button');
    b.className = 'btn '+(a.cls||'');
    b.textContent = a.label;
    b.addEventListener('click', ()=>{ if(a.onClick) a.onClick(); if(a.close!==false) closeModal(); });
    act.appendChild(b);
  });
  document.getElementById('modalBack').classList.add('on');
}
function closeModal(){ document.getElementById('modalBack').classList.remove('on'); }
document.getElementById('modalBack').addEventListener('click', e=>{ if(e.target.id==='modalBack') closeModal(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeModal(); });

/* ============================================================
   EXPORT — JSON & CSV
============================================================ */
function snapshot(){
  return { schemaVersion:SCHEMA_VERSION, settings, trades, exportedAt:new Date().toISOString() };
}
function downloadBlob(content, filename, mime){
  const blob = new Blob([content], { type:mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function exportData(){
  downloadBlob(JSON.stringify(snapshot(), null, 2), `nq-journal-${todayNY()}.json`, 'application/json');
  showToast('فایل JSON دانلود شد');
}

const CSV_COLS = [
  ['id','id'], ['date','date'], ['symbol','symbol'], ['trend','trend'], ['direction','direction'],
  ['entry_time','entryTime'], ['duration_minutes','durationMinutes'], ['result','result'], ['r','rr'], ['ideal_r','idealRR'], ['could_be_profit','couldBeProfitOrBE'],
  ['killzone','killzone'], ['lot','lotSize'], ['gross_pl','grossPL'],
  ['commission','__commission'], ['net_pl','__net'],
  ['setup','__setup'],
  ['checklist_done','__cl'], ['bsl','cl.bsl'], ['ssl','cl.ssl'], ['fvg','cl.fvg'], ['ob','cl.ob'],
  ['with_crt','cl.withCrt'], ['without_crt','cl.withoutCrt'], ['entry_cisd','cl.entryCisd'], ['pullback_cisd','cl.pullbackCisd'],
  ['cisd','cl.cisd'], ['mss','cl.mss'], ['ob50','cl.ob50'],
  
  ['leg_strong','cl.leg_strong'], ['leg_fvg','cl.leg_fvg'], ['m15_cisd','cl.m15_cisd'], ['ifvg','cl.ifvg'],
  ['follow_through','cl.followThrough'], ['stop_raid','cl.sr'], ['break_ob','cl.breakob'],
  ['entry_reason','entryReason'], ['exit_reason','exitReason'], ['notes','notes'],
  ['chart_15m','__l15'], ['chart_1m','__l1'], ['created_at','createdAt']
];
function csvCell(v){
  if(v===null || v===undefined) return '';
  if(typeof v === 'boolean') return v ? '1' : '0';
  const s = String(v);
  return /[",\n\r;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function tradeToCsvRow(t){
  const cl = t.checklist || {};
  return CSV_COLS.map(([,key])=>{
    if(key==='__commission') return calcCommission(t).toFixed(2);
    if(key==='__net') return calcNet(t).toFixed(2);
    if(key==='__cl'){ const st=getSetup(t.setupId); return stepsDoneCount(st.steps,cl)+'/'+st.steps.length; }
    if(key==='__setup') return getSetup(t.setupId).label;
    if(key==='__l15') return (t.links&&t.links['15'])||'';
    if(key==='__l1') return (t.links&&t.links['1'])||'';
    if(key.startsWith('cl.')) return !!cl[key.slice(3)];
    return t[key];
  }).map(csvCell).join(',');
}
function exportCsv(){
  if(!trades.length){ showToast('معامله‌ای برای خروجی نیست'); return; }
  const rows = chronological(trades).map(tradeToCsvRow);
  /* "sep=," makes Excel use the comma delimiter regardless of the machine's
     regional settings; the BOM keeps Persian text readable. */
  const csv = 'sep=,\r\n' + CSV_COLS.map(c=>c[0]).join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
  downloadBlob('\ufeff'+csv, `nq-journal-${todayNY()}.csv`, 'text/csv;charset=utf-8');
  showToast(`${trades.length} معامله در CSV ذخیره شد`);
}

/* ============================================================
   IMPORT — merge or replace, with duplicate detection
============================================================ */
function tradeFingerprint(t){
  return [t.date||'', t.direction||'', t.result||'', Number(t.rr)||0,
          Number(t.grossPL)||0, Number(t.lotSize)||0, t.killzone||''].join('|');
}
function parseCsvTrades(text){
  const lines = text.replace(/^\ufeff/,'').split(/\r?\n/).filter(l=>l.trim()!=='');
  if(lines.length && /^sep=/i.test(lines[0])) lines.shift();
  if(!lines.length) return [];
  const split = line=>{
    const out=[]; let cur=''; let q=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(q){ if(c==='"'){ if(line[i+1]==='"'){ cur+='"'; i++; } else q=false; } else cur+=c; }
      else if(c==='"') q=true;
      else if(c===','){ out.push(cur); cur=''; }
      else cur+=c;
    }
    out.push(cur); return out;
  };
  const head = split(lines[0]).map(h=>h.trim());
  const idx = name=> head.indexOf(name);
  return lines.slice(1).map(line=>{
    const c = split(line);
    const g = name=>{ const i=idx(name); return i>-1 ? c[i] : ''; };
    const bool = name=> g(name)==='1' || g(name).toLowerCase()==='true';
    return {
      id: g('id') || undefined,
      v: SCHEMA_VERSION,
      date: g('date'), symbol: SYMBOL, entryTime:g('entry_time'), durationMinutes:g('duration_minutes')===''?null:Number(g('duration_minutes')),
      trend: g('trend')||'bullish', direction: g('direction')||'buy',
      result: g('result')||'be',
      rr: Number(g('r'))||0, idealRR: g('ideal_r')===''?null:Number(g('ideal_r')),
      couldBeProfitOrBE: bool('could_be_profit'),
      killzone: g('killzone'),
      lotSize: Number(g('lot'))||0, grossPL: Number(g('gross_pl'))||0,
      entryReason: g('entry_reason'), exitReason: g('exit_reason'), notes: g('notes'),
      checklist: {
        bsl:bool('bsl'), ssl:bool('ssl'), fvg:bool('fvg'), ob:bool('ob'),
        crt:bool('crt'), box:bool('box'),withCrt:bool('with_crt'),withoutCrt:bool('without_crt'),entryCisd:bool('entry_cisd'),pullbackCisd:bool('pullback_cisd'),ifvg:bool('ifvg'),
        cisd:bool('cisd'), mss:bool('mss'),
        ob50:bool('ob50'), followThrough:bool('follow_through'), sr:bool('stop_raid'),
        breakob:bool('break_ob')
      },
      links: { '15': g('chart_15m'), '1': g('chart_1m') },
      createdAt: Number(g('created_at')) || 0
    };
  }).filter(t=>t.date);
}

function analyseImport(incoming){
  const byId = new Map(trades.map(t=>[t.id,t]));
  const byFp = new Map(trades.map(t=>[tradeFingerprint(t),t]));
  const fresh=[], dupes=[], conflicts=[];
  const seen = new Set();
  incoming.forEach(t=>{
    const fp = tradeFingerprint(t);
    if(seen.has(fp)){ dupes.push(t); return; }
    seen.add(fp);
    const sameId = t.id && byId.get(t.id);
    if(sameId){
      if(tradeFingerprint(sameId)===fp) dupes.push(t);
      else conflicts.push({ incoming:t, existing:sameId });
    }
    else if(byFp.has(fp)) dupes.push(t);
    else fresh.push(t);
  });
  return { fresh, dupes, conflicts };
}

function applyImport(incoming, mode, conflicts, importedSettings){
  if(mode==='replace'){
    trades = incoming;
  } else {
    const byId = new Map(trades.map(t=>[t.id,t]));
    if(mode==='merge-overwrite'){
      conflicts.forEach(c=>{
        const i = trades.findIndex(t=>t.id===c.existing.id);
        if(i>-1) trades[i] = c.incoming;
      });
    }
    const analysis = analyseImport(incoming);
    analysis.fresh.forEach(t=>{
      /* a re-used id from another device must not overwrite a local trade */
      if(byId.has(t.id)) t.id = uid();
      trades.push(t);
    });
  }
  if(importedSettings) settings = Object.assign({}, settings, importedSettings);
  trades = trades.map(migrateTrade);
  commitTrades(); saveSettings(settings);
  populateAccountFields(); refreshAll();
}

async function importDataFromFile(file){
  let incoming = [], importedSettings = null;
  try{
    const text = await file.text();
    if(/\.csv$/i.test(file.name) || /^sep=|(^|\r?\n)id,date,/i.test(text.slice(0,200))){
      incoming = parseCsvTrades(text);
    } else {
      const data = JSON.parse(text);
      if(Array.isArray(data)) incoming = data;
      else if(data && Array.isArray(data.trades)){ incoming = data.trades; importedSettings = data.settings || null; }
      else throw new Error('invalid');
    }
    if(!incoming.length) throw new Error('empty');
  }catch(err){ showToast('فایل نامعتبر یا خالی است'); return; }

  incoming = incoming.map(migrateTrade);
  const { fresh, dupes, conflicts } = analyseImport(incoming);

  const body = `
    <div class="kv-list">
      <div class="kv"><span>معامله در فایل</span><b>${incoming.length}</b></div>
      <div class="kv good"><span>جدید (اضافه می‌شود)</span><b>${fresh.length}</b></div>
      <div class="kv"><span>تکراری (رد می‌شود)</span><b>${dupes.length}</b></div>
      <div class="kv ${conflicts.length?'warn':''}"><span>هم‌شناسه ولی متفاوت</span><b>${conflicts.length}</b></div>
      <div class="kv"><span>الان در ژورنال</span><b>${trades.length}</b></div>
    </div>
    ${conflicts.length ? '<div style="font-size:12px;color:var(--muted)">این‌ها همان شناسه را دارند ولی محتوایشان فرق دارد — معمولاً یعنی روی دستگاه دیگری ویرایش شده‌اند.</div>' : ''}
  `;

  const actions = [
    { label:'انصراف', cls:'btn-ghost' },
    { label:`ادغام (+${fresh.length})`, cls:'btn-primary', onClick:()=>{
        applyImport(incoming, 'merge', conflicts, importedSettings);
        showToast(`${fresh.length} معاملهٔ جدید اضافه شد`);
      } }
  ];
  if(conflicts.length){
    actions.push({ label:'ادغام + جایگزینی موارد متضاد', onClick:()=>{
      applyImport(incoming, 'merge-overwrite', conflicts, importedSettings);
      showToast('ادغام شد و موارد متضاد به‌روزرسانی شدند');
    }});
  }
  actions.push({ label:'جایگزینی کامل', cls:'btn-danger', onClick:()=>{
    if(!confirm('همهٔ معاملات فعلی حذف و با فایل جایگزین می‌شوند. ادامه؟')) return;
    applyImport(incoming, 'replace', conflicts, importedSettings);
    showToast('داده‌ها جایگزین شد');
  }});

  openModal({ title:'ایمپورت داده', sub:file.name, body, actions });
}

/* ============================================================
   MONTHLY PDF REPORT (via the browser print dialog)
============================================================ */
function monthTrades(y, mIdx){
  const prefix = `${y}-${pad2(mIdx+1)}-`;
  return chronological(trades.filter(t=>(t.date||'').startsWith(prefix)));
}
function equitySvgForPrint(list, startBalance){
  const w=680, h=220, pad=26;
  let bal = startBalance;
  const nodes = [startBalance];
  list.forEach(t=>{ bal += calcNet(t); nodes.push(bal); });
  const minV=Math.min(...nodes), maxV=Math.max(...nodes);
  const span=(maxV-minV)|| Math.max(1,Math.abs(maxV)*0.02);
  const lo=minV-span*0.1, hi=maxV+span*0.1, range=hi-lo;
  const stepX = nodes.length>1 ? (w-2*pad)/(nodes.length-1) : 0;
  const toY = v => h-pad-((v-lo)/range)*(h-2*pad);
  const pts = nodes.map((v,i)=>[pad+i*stepX, toY(v)]);
  const line = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const area = line+` L${pts[pts.length-1][0].toFixed(1)},${h-pad} L${pad},${h-pad} Z`;
  const zeroY = (startBalance>=lo && startBalance<=hi) ? toY(startBalance) : null;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f5fd0" stop-opacity=".22"/><stop offset="100%" stop-color="#1f5fd0" stop-opacity="0"/>
    </linearGradient></defs>
    <rect x="0" y="0" width="${w}" height="${h}" fill="none"/>
    ${[0,1,2,3,4].map(i=>{const y=pad+i*((h-2*pad)/4); return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#dde3ec" stroke-dasharray="3 5"/>`;}).join('')}
    ${zeroY!==null?`<line x1="${pad}" y1="${zeroY.toFixed(1)}" x2="${w-pad}" y2="${zeroY.toFixed(1)}" stroke="#9aa5b5" stroke-dasharray="4 4"/>`:''}
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#1f5fd0" stroke-width="2"/>
    <text x="${pad}" y="16" font-size="11" fill="#7c8697" font-family="monospace">${fmtCompact(hi)}</text>
    <text x="${pad}" y="${h-6}" font-size="11" fill="#7c8697" font-family="monospace">${fmtCompact(lo)}</text>
  </svg>`;
}
function buildMonthlyReport(y, mIdx){
  const list = monthTrades(y, mIdx);
  if(!list.length){ showToast('این ماه معامله‌ای ندارد'); return; }

  /* balance as it stood the moment the month began */
  const prefix = `${y}-${pad2(mIdx+1)}`;
  const before = chronological(trades).filter(t=>(t.date||'') < prefix+'-01');
  const startBalance = (Number(settings.initialBalance)||0) + before.reduce((s,t)=>s+calcNet(t),0);

  const net = list.reduce((s,t)=>s+calcNet(t),0);
  const gross = list.reduce((s,t)=>s+(Number(t.grossPL)||0),0);
  const comm = list.reduce((s,t)=>s+calcCommission(t),0);
  const wins = list.filter(t=>t.result==='win');
  const losses = list.filter(t=>t.result==='loss');
  const bes = list.filter(t=>t.result==='be');
  const decided = wins.length+losses.length;
  const winRate = decided ? wins.length/decided*100 : 0;
  const totalR = list.reduce((s,t)=>s+(Number(t.rr)||0),0);
  const avgWin = wins.length ? wins.reduce((s,t)=>s+calcNet(t),0)/wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s,t)=>s+calcNet(t),0)/losses.length : 0;
  const gp = list.filter(t=>calcNet(t)>0).reduce((s,t)=>s+calcNet(t),0);
  const gl = Math.abs(list.filter(t=>calcNet(t)<0).reduce((s,t)=>s+calcNet(t),0));
  const pf = gl ? (gp/gl).toFixed(2) : (gp>0?'∞':'—');
  const expectancy = decided ? (wins.length/decided)*avgWin + (losses.length/decided)*avgLoss : 0;

  /* max drawdown within the month */
  let peak = startBalance, bal = startBalance, maxDD = 0;
  list.forEach(t=>{ bal += calcNet(t); peak = Math.max(peak, bal); maxDD = Math.min(maxDD, bal-peak); });

  const kzRows = KZ_OPTIONS.map(k=>{
    const l = list.filter(t=>t.killzone===k);
    if(!l.length) return '';
    const w2 = l.filter(t=>t.result==='win').length, l2 = l.filter(t=>t.result==='loss').length;
    const d2 = w2+l2;
    return `<tr><td>${esc(k)}</td><td>${l.length}</td><td>${d2?(w2/d2*100).toFixed(0):'—'}%</td>
      <td>${fmtR(l.reduce((s,t)=>s+(Number(t.rr)||0),0))}</td>
      <td class="${l.reduce((s,t)=>s+calcNet(t),0)>=0?'p':'n'}">${fmtUSD(l.reduce((s,t)=>s+calcNet(t),0))}</td></tr>`;
  }).join('');

  const rows = list.map(t=>`<tr>
      <td class="mono">${esc(t.date)}</td>
      <td>${t.direction==='buy'?'Buy':'Sell'}</td>
      <td>${esc(t.killzone||'')}</td>
      <td>${t.result==='win'?'Win':t.result==='loss'?'Loss':'BE'}</td>
      <td class="mono">${fmtR(t.rr)}</td>
      <td class="mono">${t.lotSize||0}</td>
      <td class="mono ${calcNet(t)>=0?'p':'n'}">${fmtUSD(calcNet(t))}</td>
      <td class="note">${esc((t.notes||t.exitReason||'').slice(0,90))}</td>
    </tr>`).join('');

  const stat = (k,v,cls)=>`<div class="s"><span>${k}</span><b class="${cls||''}">${v}</b></div>`;

  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<title>NQ Journal — ${MONTHS_EN[mIdx]} ${y}</title>
<style>
  @page{ size:A4; margin:14mm; }
  *{box-sizing:border-box;}
  body{ font-family:'Vazirmatn',Tahoma,sans-serif; color:#141a24; margin:0; font-size:12px; line-height:1.7; }
  h1{ font-size:20px; margin:0; letter-spacing:-.4px; }
  .sub{ color:#5d6879; font-size:11px; margin-bottom:14px; }
  .head{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #141a24; padding-bottom:8px; margin-bottom:14px; }
  .stats{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:16px; }
  .s{ border:1px solid #dde3ec; border-radius:8px; padding:8px 10px; }
  .s span{ display:block; font-size:9px; letter-spacing:.6px; color:#7c8697; text-transform:uppercase; font-family:monospace; }
  .s b{ font-size:15px; font-family:monospace; direction:ltr; display:block; margin-top:2px; }
  .p{ color:#0a7d4b; } .n{ color:#c0392b; }
  h2{ font-size:13px; margin:16px 0 7px; }
  table{ width:100%; border-collapse:collapse; font-size:10.5px; }
  th{ background:#f2f5f9; text-align:right; padding:5px 6px; border-bottom:1px solid #dde3ec; font-size:9.5px; letter-spacing:.4px; }
  td{ padding:4px 6px; border-bottom:1px solid #eef1f6; }
  .mono{ font-family:monospace; direction:ltr; }
  .note{ color:#5d6879; }
  tbody tr{ page-break-inside:avoid; }
  .chart{ border:1px solid #dde3ec; border-radius:10px; padding:8px; margin-bottom:6px; }
  .foot{ margin-top:18px; font-size:9.5px; color:#8b95a6; border-top:1px solid #dde3ec; padding-top:7px; }
  @media print{ .noprint{ display:none; } }
  .noprint{ position:fixed; top:10px; left:10px; background:#1f5fd0; color:#fff; border:none; border-radius:8px; padding:9px 16px; font-size:13px; cursor:pointer; font-family:inherit; }
</style></head><body>
<button class="noprint" onclick="window.print()">چاپ / ذخیره به‌صورت PDF</button>
<div class="head">
  <div><h1>NQ Journal — ${MONTHS_EN[mIdx]} ${y}</h1>
  <div class="sub">S&S · NY 🗽 (SM) · ساخته‌شده در ${esc(todayNY())}</div></div>
  <div class="mono" style="font-size:22px;font-weight:700" class="${net>=0?'p':'n'}">${fmtUSD(net)}</div>
</div>
<div class="stats">
  ${stat('NET PNL', fmtUSD(net), net>=0?'p':'n')}
  ${stat('TOTAL R', fmtR(totalR), totalR>=0?'p':'n')}
  ${stat('WIN RATE', winRate.toFixed(1)+'%')}
  ${stat('TRADES', list.length+' ('+wins.length+'W/'+losses.length+'L/'+bes.length+'BE)')}
  ${stat('PROFIT FACTOR', pf)}
  ${stat('EXPECTANCY', fmtUSD(expectancy), expectancy>=0?'p':'n')}
  ${stat('AVG WIN / LOSS', fmtUSD(avgWin)+' / '+fmtUSD(avgLoss))}
  ${stat('MAX DRAWDOWN', fmtUSD(maxDD), 'n')}
  ${stat('GROSS', fmtUSD(gross))}
  ${stat('COMMISSION', fmtUSD(comm), 'n')}
  ${stat('START BALANCE', fmtUSD(startBalance))}
  ${stat('END BALANCE', fmtUSD(startBalance+net), (startBalance+net)>=startBalance?'p':'n')}
</div>
<h2>منحنی موجودی</h2>
<div class="chart">${equitySvgForPrint(list, startBalance)}</div>
${kzRows ? `<h2>عملکرد بر حسب کیل‌زون</h2>
<table><thead><tr><th>کیل‌زون</th><th>تعداد</th><th>نرخ برد</th><th>R</th><th>خالص</th></tr></thead><tbody>${kzRows}</tbody></table>` : ''}
<h2>معاملات</h2>
<table><thead><tr><th>تاریخ</th><th>جهت</th><th>کیل‌زون</th><th>نتیجه</th><th>R</th><th>لات</th><th>خالص</th><th>یادداشت</th></tr></thead><tbody>${rows}</tbody></table>
<div class="foot">این گزارش از دادهٔ محلی مرورگر ساخته شده است. برای ذخیره به‌صورت PDF، در پنجرهٔ چاپ گزینهٔ «Save as PDF» را انتخاب کن.</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},350);});<\/script>
</body></html>`;

  const win = window.open('', '_blank');
  if(!win){ showToast('پنجرهٔ گزارش مسدود شد — pop-up را مجاز کن'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

function openReportPicker(){
  const years = [...new Set(trades.map(t=>(t.date||'').slice(0,4)).filter(Boolean))].sort().reverse();
  if(!years.length){ showToast('هنوز معامله‌ای ثبت نشده'); return; }
  const y0 = years.includes(String(calState.year)) ? String(calState.year) : years[0];
  const body = `
    <div class="form-grid-2">
      <div class="field"><label for="rp-year">سال</label>
        <select id="rp-year">${years.map(y=>`<option ${y===y0?'selected':''}>${esc(y)}</option>`).join('')}</select></div>
      <div class="field"><label for="rp-month">ماه</label>
        <select id="rp-month">${MONTHS_EN.map((m,i)=>`<option value="${i}" ${i===calState.month?'selected':''}>${m}</option>`).join('')}</select></div>
    </div>`;
  openModal({
    title:'گزارش PDF ماهانه',
    sub:'ماه را انتخاب کن؛ گزارش در یک تب جدید باز می‌شود.',
    body,
    actions:[
      { label:'انصراف', cls:'btn-ghost' },
      { label:'ساخت گزارش', cls:'btn-primary', onClick:()=>{
          const y = Number(document.getElementById('rp-year').value);
          const m = Number(document.getElementById('rp-month').value);
          setTimeout(()=>buildMonthlyReport(y,m), 60);
        } }
    ]
  });
}

/* ============================================================
   SUPABASE CLOUD SYNC (replaces the old Google Drive sync)
   Each logged-in user has (at most) one row in the "trades" table;
   trade_data holds { trades, settings, syncedAt }.
============================================================ */
function setSyncStatus(text, state){
  const dot = document.getElementById('syncDot');
  const status = document.getElementById('syncStatus');
  if(status) status.textContent = text;
  if(dot){ dot.classList.toggle('on', state==='ok'); dot.classList.toggle('err', state==='err'); }
}

let supaRowId = null;
let supaSyncTimer = null;

function scheduleAutoSync(){
  if(!currentUser) return Promise.resolve(true);
  /* Fire right away (no debounce): the app only calls this after discrete
     actions (submit/edit/delete a trade, save settings), not on every
     keystroke, so there's no flood risk — and immediate saving means a
     quick refresh right after saving a trade can never lose it. */
  clearTimeout(supaSyncTimer);
  return syncToSupabase(true);
}

async function syncToSupabase(silent){
  if(!currentUser) return true;
  try{
    setSyncStatus('در حال ذخیره در سرور…');
    const payload = { trades, settings, syncedAt:new Date().toISOString() };
    if(supaRowId){
      const { error } = await supabaseClient.from('trades')
        .update({ trade_data: payload })
        .eq('id', supaRowId);
      if(error) throw error;
    } else {
      const { data, error } = await supabaseClient.from('trades')
        .insert({ user_id: currentUser.id, trade_data: payload })
        .select('id')
        .single();
      if(error) throw error;
      supaRowId = data.id;
    }
    setSyncStatus('همگام با سرور ✓', 'ok');
    if(!silent) showToast('در سرور ذخیره شد ✓');
    return true;
  }catch(e){
    console.error('Supabase sync failed', e);
    setSyncStatus('ذخیره در سرور ناموفق بود', 'err');
    if(!silent) showToast('ذخیره در سرور ناموفق بود');
    return false;
  }
}

/* Called right after login/signup and on an existing session. Pulls this
   user's row (if any) and replaces the local trades/settings with it. */
async function loadUserTrades(){
  if(!currentUser) return;
  /* Always start from a clean slate: this browser's localStorage cache may
     hold another user's data from a previous session on the same device. */
  trades = [];
  settings = { ...DEFAULT_SETTINGS };
  supaRowId = null;
  try{
    setSyncStatus('در حال دریافت از سرور…');
    const { data, error } = await supabaseClient
      .from('trades')
      .select('id, trade_data')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending:false })
      .limit(1)
      .maybeSingle();
    if(error) throw error;
    if(data){
      supaRowId = data.id;
      const payload = data.trade_data || {};
      if(Array.isArray(payload.trades)) trades = payload.trades.map(migrateTrade);
      if(payload.settings) settings = Object.assign({}, DEFAULT_SETTINGS, payload.settings);
    }
    setSyncStatus('متصل — ' + (currentUser.email||''), 'ok');
  }catch(e){
    console.error('Supabase load failed', e);
    setSyncStatus('دریافت از سرور ناموفق بود', 'err');
    showToast('دریافت داده از سرور ناموفق بود؛ صفحه را دوباره بارگذاری کنید.');
    document.getElementById('app-shell').style.display='none';
    document.getElementById('auth-modal').style.display='';
    showAuthMsg('دریافت معاملات ناموفق بود. برای جلوگیری از ثبت روی داده ناقص، دوباره وارد شوید.');
    return;
  }
  rebuildIndex();
  saveTrades(trades);
  saveSettings(settings);
  refreshAll();
  renderStandaloneChecklist();
  populateAccountFields();
  populateFilters();
  renderTradesList();
}

/* ---------- wiring ---------- */
document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('reportBtn').addEventListener('click', openReportPicker);
document.getElementById('importBtn').addEventListener('click', ()=> document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', async e=>{ const f=e.target.files[0]; if(f) await importDataFromFile(f); e.target.value=''; });
document.getElementById('clearAllBtnJournal').addEventListener('click', clearTradesOnly);
document.getElementById('exportBtnJournal').addEventListener('click', exportData);
document.getElementById('exportCsvBtnJournal').addEventListener('click', exportCsv);
document.getElementById('importBtnJournal').addEventListener('click', ()=> document.getElementById('importFileJournal').click());
document.getElementById('importFileJournal').addEventListener('change', async e=>{ const f=e.target.files[0]; if(f) await importDataFromFile(f); e.target.value=''; });
document.getElementById('calReportBtn').addEventListener('click', ()=> buildMonthlyReport(calState.year, calState.month));

const logoutBtnEl = document.getElementById('logoutBtn');
if(logoutBtnEl) logoutBtnEl.addEventListener('click', handleLogout);

document.getElementById('calPrevMonth').addEventListener('click', ()=>shiftMonth(-1));
document.getElementById('calNextMonth').addEventListener('click', ()=>shiftMonth(1));
document.getElementById('calPrevYear').addEventListener('click', ()=>shiftYear(-1));
document.getElementById('calNextYear').addEventListener('click', ()=>shiftYear(1));
document.getElementById('calTodayBtn').addEventListener('click', jumpToday);
initSeg('calViewSeg', val=>{ calState.view=val; renderCalendar(); });
initSeg('calModeSeg', val=>{ calState.mode=val; renderCalendar(); });
initSeg('calBalanceSeg', val=>{ calState.balanceMode=val; renderCalendar(); });

document.getElementById('themeSwitch').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  applyTheme(b.dataset.theme);
});

/* ============================================================
   KEYBOARD SHORTCUTS (desktop)
============================================================ */
document.addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA' || e.target.tagName==='SELECT') return;
  if(document.getElementById('modalBack').classList.contains('on')) return;
  const views = ['dashboard','journal','calendar','checklist','roadmap','account'];
  if(e.key>='1' && e.key<='6'){ e.preventDefault(); goToView(views[Number(e.key)-1]); return; }
  if(e.key==='n' && !e.metaKey && !e.ctrlKey){
    e.preventDefault(); goToView('journal');
    setTimeout(()=>document.getElementById('newTradeBtn').click(), 50); return;
  }
  if(e.key==='Escape'){
    document.getElementById('tradeFormPanel').classList.add('hidden');
    editingTradeId = null;
  }
});
function init(){
  applyTheme(loadTheme());
  settings = loadSettings();
  trades = loadTrades().map(migrateTrade);
  rebuildIndex();
  commitTrades();          /* re-save migrated data and build index */
  resetForm();
  renderStandaloneChecklist();
  populateAccountFields();
  populateFilters();
  renderDashboard(); renderCalendar();
  renderTradesList();
}
init();
/* Performance: every aggregation uses the same selected date range. */
function perfStats(rows){
 const wins=rows.filter(a=>a.eff==='win').length, losses=rows.filter(a=>a.eff==='loss').length;
 return {n:rows.length,net:rows.reduce((s,a)=>s+a.net,0),rr:rows.length?rows.reduce((s,a)=>s+Number(a.t.rr||0),0)/rows.length:null,wr:wins+losses?wins/(wins+losses)*100:null};
}
function perfBars(groups,metric='net'){
 if(!groups.some(g=>g.rows.length))return '<div class="empty-state">هنوز داده‌ای برای این نمودار ثبت نشده است.</div>';
 const vals=groups.map(g=>perfStats(g.rows)[metric]);const max=Math.max(1,...vals.map(v=>Math.abs(v||0)));
 return '<div class="perf-bars" dir="ltr">'+groups.map((g,i)=>{let v=vals[i];return `<div class="perf-bar-row"><span>${esc(g.label)}</span><div class="perf-bar-track"><i class="${v<0?'negative':''}" style="width:${Math.abs(v||0)/max*100}%"></i></div><b>${!g.rows.length||v===null?'—':metric==='net'?fmtUSD(v):metric==='wr'?v.toFixed(1)+'%':metric==='rr'?v.toFixed(2)+'R':v}</b></div>`;}).join('')+'</div>';
}
function perfDonut(value,total,label,color){
 const pct=total?value/total*100:0;
 return `<div class="perf-donut" style="--arc:${pct}%;--donut-color:${color}"><div><b>${total?pct.toFixed(1)+'%':'—'}</b><span>${label}</span></div></div>`;
}
function renderPerformance(ann){
 const host=document.getElementById('performanceExtra');if(!host)return;
 const expandedSections=new Set([...host.querySelectorAll('details[open]')].map(d=>d.dataset.section));
 const ui=window.performanceUI||(window.performanceUI={month:todayNY().slice(0,7),metric:'net',calendarMode:'net',balance:'initial'});
 const buys=ann.filter(a=>a.t.direction==='buy'), sells=ann.filter(a=>a.t.direction==='sell');
 const bySide=[{label:'Buy',rows:buys},{label:'Sell',rows:sells}];
 const sessions=[...new Set(['NY AM','NY PM',...ann.map(a=>a.t.killzone||'Out of Killzone')])].map(label=>({label,rows:ann.filter(a=>a.t.killzone===label)}));
 const timed=ann.filter(a=>/^([01]\d|2[0-3]):[0-5]\d/.test(a.t.entryTime||''));
 const hours=[...new Set(timed.map(a=>a.t.entryTime.slice(0,2)))].sort().map(h=>({label:h+':00',rows:timed.filter(a=>a.t.entryTime.slice(0,2)===h)}));
 const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=>({label,rows:ann.filter(a=>(new Date(a.t.date+'T12:00:00Z').getUTCDay()+6)%7===i)}));
 const year=Number(ui.month.slice(0,4));const month=Number(ui.month.slice(5))-1;
 const base=ui.balance==='current'?calcBalance():Number(settings.initialBalance);
 const monthRows=Array.from({length:12},(_,i)=>ann.filter(a=>a.t.date.slice(0,7)===`${year}-${pad2(i+1)}`));
 const yearRows=ann.filter(a=>a.t.date.startsWith(year+'-'));
 const pct=rows=>!rows.length||!base?'—':fmtPct(perfStats(rows).net/base*100);
 let calendar='';const leading=(new Date(Date.UTC(year,month,1)).getUTCDay()+6)%7;
 for(let i=0;i<leading;i++)calendar+='<div class="pcell blank"></div>';
 for(let d=1;d<=new Date(Date.UTC(year,month+1,0)).getUTCDate();d++){
  const date=`${year}-${pad2(month+1)}-${pad2(d)}`,rs=ann.filter(a=>a.t.date===date),st=perfStats(rs);
  let val=ui.calendarMode==='n'?String(st.n):ui.calendarMode==='pct'?pct(rs):fmtUSD(st.net);
  calendar+=`<div class="pcell ${rs.length?(st.net<0?'negative':'positive'):''}"><b>${d}</b>${rs.length?`<small>${st.n} trades</small><strong>${val}</strong>`:''}</div>`;
 }
 const dates=[...new Set(ann.map(a=>a.t.date))].sort();
 const span=dates.length?Math.floor((Date.parse(dates.at(-1))-Date.parse(dates[0]))/86400000)+1:0;
 const freq=[{label:'Trades / day',v:span?ann.length/span:null,groups:days},{label:'Trades / week',v:span?ann.length/(Math.floor((span-1)/7)+1):null,groups:[]},{label:'Trades / month',v:dates.length?ann.length/((Number(dates.at(-1).slice(0,4))-Number(dates[0].slice(0,4)))*12+Number(dates.at(-1).slice(5,7))-Number(dates[0].slice(5,7))+1):null,groups:monthRows.map((rows,i)=>({label:MONTHS_EN[i].slice(0,3),rows}))}];
 const weeks=new Map();ann.forEach(a=>{let dt=new Date(a.t.date+'T12:00:00Z');dt.setUTCDate(dt.getUTCDate()-(dt.getUTCDay()+6)%7);let k=dt.toISOString().slice(0,10);if(!weeks.has(k))weeks.set(k,[]);weeks.get(k).push(a);});freq[1].groups=[...weeks].map(([label,rows])=>({label,rows}));
 const opts=(items,selected)=>items.map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('');
 host.innerHTML=`
 <h2 class="perf-heading en">Performance by side</h2><div class="road-grid"><article class="panel"><h3 class="en">Total Trades</h3><div class="donut-pair"><div class="side-total">${perfDonut(buys.length,buys.length+sells.length,'Buy','var(--profit)')}<p><span>Buy · ${buys.length}</span><span>Sell · ${sells.length}</span></p></div></div></article><article class="panel"><h3 class="en">Win Rate</h3><div class="donut-pair">${bySide.map(g=>perfDonut(g.rows.filter(a=>a.eff==='win').length,g.rows.filter(a=>a.eff!=='be').length,g.label,g.label==='Buy'?'var(--profit)':'var(--chart-blue)')).join('')}</div></article></div>
 <h2 class="perf-heading en">Performance by session</h2><div class="session-grid">${[['wr','Win Rate'],['n','Total Trades'],['rr','Avg RR'],['net','Profit']].map(([key,label])=>`<article class="panel"><h3 class="en">${label}</h3>${perfBars(sessions,key)}</article>`).join('')}</div>
 <article class="panel"><div class="panel-head"><h2 class="perf-heading en">Performance by time</h2><select id="perfMetric" aria-label="معیار نمودار ساعت">${opts([['net','Total Profit/Loss'],['wr','Win Rate'],['n','Total Trades'],['rr','Avg RR']],ui.metric)}</select></div><p class="hint">ساعت ورود به وقت نیویورک؛ ${ann.length-timed.length} معامله بدون ساعت ثبت‌شده</p>${perfColumns(hours,ui.metric)}</article>
 <article class="panel"><h2 class="perf-heading en">Performance by day</h2>${perfDayBars(days)}<div class="perf-day-wr en">${days.map(g=>{let s=perfStats(g.rows);return `<span>${g.label} · ${s.wr===null?'—':s.wr.toFixed(1)+'% WR'}</span>`;}).join('')}</div></article>
 <article class="panel"><div class="panel-head"><h2 class="perf-heading en">Performance by month</h2><select id="perfBalance" aria-label="مبنای درصد بازده">${opts([['initial','Initial Balance'],['current','Current Balance']],ui.balance)}</select></div><p class="hint">بازده خالص نسبت به موجودی انتخاب‌شده • ${year}</p><div class="month-scroll"><table class="perf-month en"><thead><tr><th>Year</th>${MONTHS_EN.map(n=>`<th>${n.slice(0,3)}</th>`).join('')}<th>YTD</th></tr></thead><tbody><tr><th>${year}</th>${monthRows.map(rs=>`<td class="${perfStats(rs).net<0?'neg':'pos'}">${pct(rs)}</td>`).join('')}<td>${pct(yearRows)}</td></tr></tbody></table></div></article>
 <article class="panel"><div class="panel-head"><h2 class="perf-heading en">Performance calendar</h2><select id="perfCalMode" aria-label="معیار تقویم">${opts([['net','Profit / Loss'],['pct','Return %'],['n','Total Trades']],ui.calendarMode)}</select></div><div class="perf-cal-nav"><button type="button" id="perfPrev" aria-label="ماه قبل">‹</button><input type="month" id="perfMonth" aria-label="ماه تقویم عملکرد" value="${ui.month}" min="1900-01" max="2200-12"><button type="button" id="perfNext" aria-label="ماه بعد">›</button></div><div class="performance-calendar en">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}${calendar}</div></article>
 <h2 class="perf-heading en">Average trade frequency</h2><p class="hint">میانگین بر مبنای فاصله اولین تا آخرین معامله، با احتساب روزهای بدون معامله</p><div class="frequency-grid">${freq.map(g=>`<article class="panel"><h3 class="en">${g.label}</h3><b class="freq-val en">${g.v===null?'—':g.v.toFixed(2)}</b>${perfColumns(g.groups,'n')}</article>`).join('')}</div>`;
 [['perfMetric','metric'],['perfBalance','balance'],['perfCalMode','calendarMode'],['perfMonth','month']].forEach(([id,key])=>document.getElementById(id).addEventListener('change',e=>{if(!e.target.value)return;ui[key]=e.target.value;renderPerformance(computeAnnotated());}));
 const shift=n=>{const dt=new Date(Date.UTC(year,month+n,1));ui.month=dt.toISOString().slice(0,7);renderPerformance(computeAnnotated());};document.getElementById('perfPrev').onclick=()=>shift(-1);document.getElementById('perfNext').onclick=()=>shift(1);
 if(typeof window.organizePerformance==='function')window.organizePerformance(host,expandedSections);
 // Duration is optional and never inferred from creation time.
 document.querySelectorAll('#wlGrid .wl-card').forEach((card,i)=>{card.querySelectorAll('.wl-duration').forEach(row=>row.remove());const ds=ann.filter(a=>a.eff===(i?'loss':'win')&&a.t.durationMinutes!=null&&Number.isFinite(Number(a.t.durationMinutes))).map(a=>Number(a.t.durationMinutes));card.insertAdjacentHTML('beforeend',`<div class="wl-row wl-duration"><span>Average duration</span><b>${ds.length?(ds.reduce((s,v)=>s+v,0)/ds.length).toFixed(1)+' min':'—'}</b></div>`);});
}
function perfColumns(groups,metric='net'){
 if(!groups.some(g=>g.rows.length))return '<div class="empty-state">هنوز داده‌ای برای این نمودار ثبت نشده است.</div>';
 const values=groups.map(g=>perfStats(g.rows)[metric]);const max=Math.max(1,...values.map(v=>Math.abs(v||0)));
 return '<div class="perf-columns" dir="ltr">'+groups.map((g,i)=>{const v=values[i];const label=!g.rows.length||v===null?'—':metric==='net'?fmtUSD(v):metric==='wr'?v.toFixed(1)+'%':metric==='rr'?v.toFixed(2)+'R':String(v);return `<div class="perf-column"><b>${label}</b><div class="column-track"><i class="${v<0?'negative':''}" style="height:${Math.abs(v||0)/max*100}%"></i></div><span>${esc(g.label)}</span></div>`;}).join('')+'</div>';
}
function perfDayBars(groups){
 if(!groups.some(g=>g.rows.length))return '<div class="empty-state">هنوز معامله‌ای ثبت نشده است.</div>';
 const sums=groups.map(g=>({gain:g.rows.reduce((s,a)=>s+Math.max(0,a.net),0),loss:g.rows.reduce((s,a)=>s+Math.max(0,-a.net),0)}));const max=Math.max(1,...sums.flatMap(s=>[s.gain,s.loss]));
 return '<div class="day-bars en">'+groups.map((g,i)=>`<div class="day-bar"><span>${g.label}</span><div class="day-negative"><i style="width:${sums[i].loss/max*100}%"></i></div><div class="day-positive"><i style="width:${sums[i].gain/max*100}%"></i></div><b>${g.rows.length?fmtUSD(perfStats(g.rows).net):'—'}</b></div>`).join('')+'</div>';
}

function aggregateEquity(ann){
 const grain=document.querySelector('#equityGranularity .on')?.dataset.grain||'all';if(grain==='all')return ann;
 const groups=new Map();
 ann.forEach(a=>{let key=a.t.date;const time=a.t.entryTime||'';if(grain!=='day'&&/^([01]\d|2[0-3]):[0-5]\d/.test(time)){key+=' '+time.slice(0,2)+':'+(grain==='quarter'?pad2(Math.floor(Number(time.slice(3,5))/15)*15):'00');}else if(grain!=='day')key+=' untimed';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(a);});
 return [...groups.values()].map(rows=>({...rows.at(-1),before:rows[0].before,net:rows.reduce((s,a)=>s+a.net,0)}));
}
document.getElementById('equityGranularity').addEventListener('click',e=>{const b=e.target.closest('[data-grain]');if(!b)return;document.querySelectorAll('#equityGranularity button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b));});renderDashboard();});
document.getElementById('beThreshold').addEventListener('change',e=>{if(Number(e.target.value)<0)e.target.value='0';renderDashboard();});
