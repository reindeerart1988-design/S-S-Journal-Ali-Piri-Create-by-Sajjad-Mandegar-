/* PDF bytes are fetched only after authorization; never stored in localStorage or caches. */
(function(){
'use strict';
const el=id=>document.getElementById(id),bucket='journal-private-tips',path='Tips.pdf';
let epoch=0,owner=null,allowed=false,blobUrl=null,busy=false;
function clearViewer(){el('tipsFrame').removeAttribute('src');el('tipsDownload').removeAttribute('href');if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=null;}
function reset(){epoch++;owner=null;allowed=false;busy=false;el('tipsOpen').disabled=false;el('tipsFile').disabled=false;el('tipsFile').value='';el('tipsStatus').textContent='';if(el('road-tab-tips').getAttribute('aria-selected')==='true')el('road-tab-rules').click();el('road-tab-tips').hidden=true;el('road-tips').hidden=true;el('tipsDialog').close();clearViewer();}
async function authorize(){
 const stamp=epoch;
 try{
  const {data:auth,error:authError}=await supabaseClient.auth.getUser();
  if(stamp!==epoch)return false;
  if(authError||!auth.user){reset();return false;}
  const {data,error}=await subscriptionTimeout(supabaseClient.rpc('journal_tips_access'));
  if(stamp!==epoch)return false;
  if(error||data!==true){reset();return false;}
  owner=auth.user.id;allowed=true;el('road-tab-tips').hidden=false;return true;
 }catch(_){if(stamp===epoch)reset();return false;}
}
async function act(task){
 if(busy)return;
 busy=true;el('tipsOpen').disabled=true;el('tipsFile').disabled=true;
 try{
  if(!await authorize())return;
  const stamp=epoch,uid=owner;
  const live=()=>stamp===epoch&&uid===owner&&allowed;
  await task(live);
 }catch(_){if(allowed)el('tipsStatus').textContent='عملیات انجام نشد؛ اتصال، دسترسی و وجود فایل را بررسی کنید.';}
 finally{busy=false;el('tipsOpen').disabled=false;el('tipsFile').disabled=false;el('tipsFile').value='';}
}
el('tipsOpen').addEventListener('click',()=>act(async live=>{
 el('tipsStatus').textContent='در حال دریافت جزوه…';
 const {data,error}=await subscriptionTimeout(supabaseClient.storage.from(bucket).download(path));
 if(!live())return;
 if(error||!data)throw Error('Download failed');
 clearViewer();blobUrl=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
 el('tipsFrame').src=blobUrl;el('tipsDownload').href=blobUrl;el('tipsDialog').showModal();el('tipsStatus').textContent='';
}));
el('tipsFile').addEventListener('change',()=>{
 const file=el('tipsFile').files[0];if(!file)return;
 if(!/\.pdf$/i.test(file.name)||file.size>20*1024*1024){el('tipsStatus').textContent='فایل PDF با حجم حداکثر ۲۰ مگابایت انتخاب کنید.';el('tipsFile').value='';return;}
 if(!confirm('این PDF به‌عنوان Tips خصوصی ذخیره و جایگزین نسخهٔ قبلی شود؟')){el('tipsFile').value='';return;}
 act(async live=>{
  const magic=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(magic!=='%PDF-')throw Error('Not PDF');
  if(!live())return;
  el('tipsStatus').textContent='در حال ذخیرهٔ جزوه…';
  const {error}=await subscriptionTimeout(supabaseClient.storage.from(bucket).upload(path,file,{upsert:true,contentType:'application/pdf',cacheControl:'0'}));
  if(!live())return;if(error)throw error;
  el('tipsDialog').close();clearViewer();el('tipsStatus').textContent='Tips خصوصی ذخیره شد.';
 });
});
el('tipsClose').addEventListener('click',()=>el('tipsDialog').close());el('tipsDialog').addEventListener('close',clearViewer);
supabaseClient.auth.onAuthStateChange((event)=>{reset();if(event!=='SIGNED_OUT')setTimeout(authorize,0);});
window.addEventListener('offline',reset);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)authorize();});
window.addEventListener('online',authorize);
setInterval(()=>{if(!document.hidden)authorize();},60000);
authorize();
})();
