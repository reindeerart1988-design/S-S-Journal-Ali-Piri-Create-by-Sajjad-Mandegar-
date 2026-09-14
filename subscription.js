function subscriptionTimeout(p){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Timeout')),15000);})]).finally(()=>clearTimeout(timer));}
/* Subscription v25. Server is authoritative; local time is only a display clock. */
let journalSubscription=null, subscriptionEpoch=0, subCheckedAt=0, subServerAt=0, subRefresh=null;
const SUB_MUTATIONS='#newTradeBtn,#submitFormBtn,[data-edit],[data-del],#saveSettingsBtn,#clearAllBtn,#clearAllBtnJournal,#importBtn,#importBtnJournal,#addTradingAccountBtn,#deleteTradingAccountBtn,[data-act="edit"],[data-act="archive"],[data-act="delete"],[data-act="cash"]';
function subscriptionWritable(){
 if(!currentUser || !journalSubscription || journalSubscription.user_id!==currentUser.id || !navigator.onLine)return false;
 if(performance.now()-subCheckedAt>120000)return false;
 return journalSubscription.can_write && (journalSubscription.is_admin || (!journalSubscription.is_suspended && Date.parse(journalSubscription.expires_at)>subServerAt+performance.now()-subCheckedAt));
}
function requireJournalWrite(){
 if(subscriptionWritable())return true;
 showToast('ثبت و تغییر اطلاعات نیازمند اعتبار فعال و اتصال به سرور است؛ مشاهده و خروجی در دسترس است.');
 return false;
}
async function refreshSubscription(){
 const owner=currentUser?.id;if(!owner)return;
 if(subRefresh?.owner===owner)return subRefresh.promise;
 const epoch=subscriptionEpoch;
 const promise=(async()=>{
  try{
   const {data,error}=await subscriptionTimeout(supabaseClient.rpc('journal_subscription_status'));
   if(error)throw error;
   if(currentUser?.id!==owner||epoch!==subscriptionEpoch)return;
   if(!data||data.user_id!==owner||!Number.isFinite(Date.parse(data.server_now)))throw Error('Invalid status');
   journalSubscription=data;subCheckedAt=performance.now();subServerAt=Date.parse(data.server_now);
  }catch(e){if(currentUser?.id===owner&&epoch===subscriptionEpoch)journalSubscription=null;}
  finally{if(currentUser?.id===owner&&epoch===subscriptionEpoch)paintSubscription();}
 })();
 subRefresh={owner,promise};try{await promise;}finally{if(subRefresh?.promise===promise)subRefresh=null;}
}
function resetSubscription(){subscriptionEpoch++;journalSubscription=null;subRefresh=null;adminRows=[];extensionRequests.clear();for(const id of ['subscriptionDialog','subscriptionAdminDialog'])document.getElementById(id)?.close();document.getElementById('subscriptionAdminRows')?.replaceChildren();paintSubscription();}
function subscriptionDate(value){return value?new Date(value).toLocaleString('fa-IR',{timeZone:'Asia/Tehran',dateStyle:'medium',timeStyle:'short'}):'—';}
function paintSubscription(){
 const bar=document.getElementById('subscriptionBar');if(!bar)return;
 bar.hidden=!currentUser;if(!currentUser)return;
 let text='بررسی اعتبار ممکن نیست؛ دوباره تلاش کنید',state='unknown';
 const d=journalSubscription;
 if(d&&d.user_id===currentUser.id){
  const left=Date.parse(d.expires_at)-(subServerAt+performance.now()-subCheckedAt);
  if(!navigator.onLine||performance.now()-subCheckedAt>120000){text='اتصال برای بررسی اعتبار لازم است';}
  else if(d.is_admin){text='حساب مدیر';state='active';}
  else if(d.is_suspended){text='دسترسی ثبت موقتاً تعلیق شده';state='expired';}
  else if(d.can_write&&left>0){const days=Math.ceil(left/86400000);text=`${d.trial_started_at?'اعتبار آزمایشی / اشتراک':'اشتراک فعال'} · ${days.toLocaleString('fa-IR')} روز باقی‌مانده`;state=days<=3?'warning':'active';}
  else{text='اعتبار تمام شده · مشاهده و خروجی فعال است';state='expired';}
 }
 document.getElementById('subscriptionStatus').textContent=text;bar.dataset.state=state;
 document.getElementById('subscriptionAdminBtn').hidden=!d?.is_admin;
 document.getElementById('subscriptionExpiry').textContent='پایان اعتبار: '+subscriptionDate(d?.expires_at)+' (تهران)';
 document.getElementById('subscriptionNotice').textContent=subscriptionWritable()?'اعتبار هر حساب فقط یک‌بار از اولین ورود موفق پس از تأیید مدیر شروع می‌شود.':'ثبت و تغییر معاملات متوقف است. اطلاعات قبلی حذف نمی‌شوند و خروجی قابل دریافت است.';
}
const extensionRequests=new Map();let adminRows=[],adminBusy=false;
async function loadSubscriptionAdmin(){
 const out=document.getElementById('subscriptionAdminRows');out.textContent='در حال دریافت…';
 const owner=currentUser?.id;
 try{const {data,error}=await supabaseClient.rpc('journal_admin_users');if(error)throw error;if(owner!==currentUser?.id)return;adminRows=data||[];renderSubscriptionAdmin();}
 catch(e){out.textContent='دریافت کاربران ممکن نشد. نصب SQL و دسترسی مدیر را بررسی کنید.';}
}
function renderSubscriptionAdmin(){
 const q=document.getElementById('subscriptionSearch').value.trim().toLowerCase();
 const rows=adminRows.filter(u=>(u.email||'').toLowerCase().includes(q)||u.id.includes(q));
 document.getElementById('subscriptionAdminRows').innerHTML=rows.map(u=>`<article class="sub-user"><strong dir="ltr">${esc(u.email||u.id)}</strong><p>${u.is_admin?'مدیر':u.is_approved?'حساب تأییدشده':'در انتظار تأیید'} · ${u.is_suspended?'تعلیق‌شده':u.expires_at?'پایان: '+esc(subscriptionDate(u.expires_at)):'دوره آزمایشی هنوز شروع نشده'}</p><div class="sub-actions"><label>روز تمدید<input type="number" min="1" max="365" value="7" data-days="${u.id}" aria-label="روز تمدید ${esc(u.email||u.id)}"></label><button type="button" class="btn" data-extend="${u.id}" ${adminBusy?'disabled':''}>افزودن اعتبار</button>${u.is_admin?'':`<button type="button" class="btn" data-approve="${u.id}" ${adminBusy?'disabled':''}>${u.is_approved?'لغو تأیید':'تأیید حساب'}</button><button type="button" class="btn" data-suspend="${u.id}" ${adminBusy?'disabled':''}>${u.is_suspended?'رفع تعلیق':'تعلیق ثبت'}</button>`}</div></article>`).join('')||'<p>کاربری پیدا نشد.</p>';
}
async function adminSubscriptionAction(e){
 const b=e.target.closest('[data-extend],[data-approve],[data-suspend]');if(!b||adminBusy)return;
 const id=b.dataset.extend||b.dataset.approve||b.dataset.suspend,u=adminRows.find(x=>x.id===id);if(!u)return;
 let fn,args;
 if(b.dataset.extend){
  const days=Number(document.querySelector(`[data-days="${id}"]`).value);if(!Number.isInteger(days)||days<1||days>365){showToast('تعداد روز باید بین ۱ و ۳۶۵ باشد.');return;}
  if(!confirm(`${days} روز به اعتبار ${u.email||id} اضافه شود؟`))return;
  const k=`${id}:${days}`;if(!extensionRequests.has(k))extensionRequests.set(k,crypto.randomUUID());
  fn='journal_admin_extend';args={p_user:id,p_days:days,p_request:extensionRequests.get(k)};
 }else{
  if(!confirm(`تغییر دسترسی ${u.email||id} انجام شود؟`))return;
  fn='journal_admin_access';args={p_user:id,p_approved:b.dataset.approve?!u.is_approved:!!u.is_approved,p_suspended:b.dataset.suspend?!u.is_suspended:!!u.is_suspended};
 }
 adminBusy=true;renderSubscriptionAdmin();
 try{const {error}=await supabaseClient.rpc(fn,args);if(error)throw error;if(fn==='journal_admin_extend')extensionRequests.delete(`${id}:${args.p_days}`);showToast('تغییر ذخیره شد.');await loadSubscriptionAdmin();await refreshSubscription();}
 catch(e){showToast('تأیید ذخیره دریافت نشد؛ اتصال را بررسی و همان درخواست را دوباره امتحان کنید.');}
 finally{adminBusy=false;renderSubscriptionAdmin();}
}
document.addEventListener('click',e=>{if(e.target.closest(SUB_MUTATIONS)&&!requireJournalWrite()){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('submit',e=>{if(['tradeForm','addAccountForm','cashForm'].includes(e.target.id)&&!requireJournalWrite()){e.preventDefault();e.stopImmediatePropagation();}},true);
document.getElementById('subscriptionRetry').addEventListener('click',refreshSubscription);
document.getElementById('subscriptionDetailsBtn').addEventListener('click',()=>document.getElementById('subscriptionDialog').showModal());
document.getElementById('subscriptionClose').addEventListener('click',()=>document.getElementById('subscriptionDialog').close());
document.getElementById('subscriptionAdminBtn').addEventListener('click',()=>{document.getElementById('subscriptionAdminDialog').showModal();loadSubscriptionAdmin();});
document.getElementById('subscriptionAdminClose').addEventListener('click',()=>document.getElementById('subscriptionAdminDialog').close());
document.getElementById('subscriptionSearch').addEventListener('input',renderSubscriptionAdmin);
document.getElementById('subscriptionAdminRefresh').addEventListener('click',loadSubscriptionAdmin);
document.getElementById('subscriptionAdminRows').addEventListener('click',adminSubscriptionAction);
window.addEventListener('online',refreshSubscription);window.addEventListener('offline',()=>{journalSubscription=null;paintSubscription();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&currentUser)refreshSubscription();});
setInterval(()=>{if(currentUser&&!document.hidden)refreshSubscription();},60000);
setInterval(paintSubscription,15000);
