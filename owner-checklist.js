(()=>{'use strict';
let epoch=0,uid=null;
const NEW_VERSION=70;
function redraw(){renderFormChecklist();renderStandaloneChecklist();}
function clear(){epoch++;uid=null;window.ownerChecklist57=null;const i=SETUP_ORDER.indexOf('owner57');if(i>=0)SETUP_ORDER.splice(i,1);if(formSetupId==='owner57'){formSetupId='cisd48';formChecklistState={};}if(currentSetupId==='owner57')currentSetupId='cisd48';delete standaloneChecklistState.owner57;SETUPS.owner57={id:'owner57',label:'مدل خصوصی',steps:[]};redraw();}
function compile(code){const m=new Function(code)();if(!m||!m.render||!m.wire||!m.steps)throw Error('Invalid private model');return m;}
function isNew(s){const v=Number(s&&s.ownerVersion);return !v||v>=NEW_VERSION;}
function compose(oldM,newM){
 if(!newM)return oldM;
 const pick=s=>(isNew(s)||!oldM)?newM:oldM;
 return{allowedSymbols:newM.allowedSymbols,
  isLegacy:s=>(isNew(s)||!oldM)?false:(oldM.isLegacy?oldM.isLegacy(s):true),
  render:s=>pick(s).render(s),
  wire:(el,s,after)=>pick(s).wire(el,s,after),
  steps:s=>pick(s).steps(s)};
}
async function load(){const n=++epoch;try{
 const {data:a,error:e}=await supabaseClient.auth.getUser();if(n!==epoch)return;if(e||!a.user){clear();return;}
 const {data,error}=await supabaseClient.rpc('journal_owner_checklist');if(n!==epoch)return;if(error||!data){clear();return;}
 if(uid===a.user.id&&window.ownerChecklist57)return;
 const oldM=compile(data);
 let newM=null;
 try{const r=await supabaseClient.rpc('journal_owner_checklist_v70');if(n!==epoch)return;if(!r.error&&r.data)newM=compile(r.data);}catch(x){newM=null;}
 window.ownerChecklist57=compose(oldM,newM);uid=a.user.id;
 SETUPS.owner57={id:'owner57',label:'مدل شخصی من 🔒',accent:'amber',steps:[]};
 if(!SETUP_ORDER.includes('owner57'))SETUP_ORDER.push('owner57');
 redraw();
}catch{if(n===epoch)clear();}}
supabaseClient.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(uid&&session?.user?.id&&session.user.id!==uid))clear();setTimeout(load,0)});
window.addEventListener('offline',clear);window.addEventListener('online',load);setInterval(load,60000);load();
})();