/* Presentation-only controls; trade records and checklist rules stay in app.js. */
(function(){
'use strict';
window.organizePerformance=function(host,expanded){
 const children=[...host.children];let group=null;let index=0;
 for(const child of children){
  if(child.tagName==='H2'||child.classList.contains('panel')){
   const heading=child.tagName==='H2'?child:child.querySelector('h2');
   if(!heading)continue;
   const title=heading.textContent;
   group=document.createElement('details');group.className='perf-details';group.dataset.section=String(index++);group.open=expanded.has(group.dataset.section);
   const summary=document.createElement('summary');const label=document.createElement('bdi');label.dir='ltr';label.textContent=title;summary.append(label);group.append(summary);host.insertBefore(group,child);
   if(child.tagName==='H2'){child.remove();continue;}
   heading.remove();group.append(child);
  }else if(group){group.append(child);}
 }
};
function ready(){
 document.querySelectorAll('.sample-card img,.road-image-card img').forEach(preview=>{
  preview.addEventListener('error',()=>{if(preview.dataset.retried)return;preview.dataset.retried='1';const url=new URL(preview.closest('[data-full]').dataset.full,location.href);url.searchParams.set('retry','16');preview.src=url.href;});
 });
 const tabs=[document.getElementById('road-tab-rules'),document.getElementById('road-tab-examples')];
 function activate(index){tabs.forEach((tab,i)=>{const selected=i===index;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});}
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(index));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowLeft'||e.key==='ArrowRight')next=1-index;else if(e.key==='Home')next=0;else if(e.key==='End')next=1;else return;e.preventDefault();activate(next);tabs[next].focus();});});
 let cards=[...document.querySelectorAll('.sample-card')];const dialog=document.getElementById('sampleViewer'),stage=document.getElementById('sampleStage'),canvas=document.getElementById('sampleCanvas'),img=document.getElementById('sampleImage');
 let current=0,zoom=1,opener=null,drag=null,scrollBefore='';
 const get=id=>document.getElementById(id);
 function layout(){
  if(!img.naturalWidth||!dialog.open)return;
  const base=Math.min(stage.clientWidth-24,(stage.clientHeight-24)*img.naturalWidth/img.naturalHeight,img.naturalWidth);
  const width=Math.max(1,base)*zoom,height=width*img.naturalHeight/img.naturalWidth;
  img.style.width=width+'px';img.style.height=height+'px';canvas.style.width=Math.max(stage.clientWidth,width+24)+'px';canvas.style.height=Math.max(stage.clientHeight,height+24)+'px';
  get('sampleZoomValue').textContent=Math.round(zoom*100)+'%';get('sampleZoomOut').disabled=zoom<=1;get('sampleZoomIn').disabled=zoom>=5;
 }
 function setZoom(value){const ox=(stage.scrollLeft+stage.clientWidth/2)/(canvas.offsetWidth||1),oy=(stage.scrollTop+stage.clientHeight/2)/(canvas.offsetHeight||1);zoom=Math.max(1,Math.min(5,value));layout();stage.scrollLeft=ox*canvas.offsetWidth-stage.clientWidth/2;stage.scrollTop=oy*canvas.offsetHeight-stage.clientHeight/2;}
 function show(index){
  current=Math.max(0,Math.min(cards.length-1,index));zoom=1;drag=null;img.hidden=true;get('sampleError').hidden=true;get('sampleTitle').textContent=cards[current].dataset.title||('نمونه ترید '+String(current+1).padStart(2,'0'));get('sampleCounter').textContent=(current+1)+' / '+cards.length;
  get('samplePrevious').disabled=current===0;get('sampleNext').disabled=current===cards.length-1;get('sampleZoomValue').textContent='100%';get('sampleZoomOut').disabled=true;get('sampleZoomIn').disabled=false;
  img.alt=cards[current].dataset.title||('چارت نمونه ترید '+(current+1));img.src=cards[current].dataset.full;stage.scrollTo(0,0);
 }
 img.addEventListener('load',()=>{img.hidden=false;layout();});img.addEventListener('error',()=>{img.hidden=true;get('sampleError').hidden=false;});
 document.querySelectorAll('.sample-card,.road-image-card').forEach(card=>card.addEventListener('click',()=>{cards=[...document.querySelectorAll(card.classList.contains('road-image-card')?'.road-image-card':'.sample-card')];const index=cards.indexOf(card);opener=card;scrollBefore=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();show(index);get('sampleClose').focus();}));
 get('sampleClose').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{document.body.style.overflow=scrollBefore;drag=null;opener?.focus();});
 get('sampleNext').addEventListener('click',()=>show(current+1));get('samplePrevious').addEventListener('click',()=>show(current-1));get('sampleZoomIn').addEventListener('click',()=>setZoom(zoom+.5));get('sampleZoomOut').addEventListener('click',()=>setZoom(zoom-.5));get('sampleFit').addEventListener('click',()=>{zoom=1;layout();stage.scrollTo(0,0);});
 document.addEventListener('keydown',e=>{if(!dialog.open)return;e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}else if(e.key==='ArrowRight'){e.preventDefault();show(current+1);}else if(e.key==='ArrowLeft'){e.preventDefault();show(current-1);}else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(zoom+.5);}else if(e.key==='-'){e.preventDefault();setZoom(zoom-.5);}},true);
 stage.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||zoom<=1)return;drag={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};stage.setPointerCapture(e.pointerId);e.preventDefault();});
 stage.addEventListener('pointermove',e=>{if(!drag)return;stage.scrollLeft=drag.left-(e.clientX-drag.x);stage.scrollTop=drag.top-(e.clientY-drag.y);});
 ['pointerup','pointercancel','lostpointercapture'].forEach(event=>stage.addEventListener(event,()=>{drag=null;}));
 stage.addEventListener('dblclick',()=>setZoom(zoom===1?2:1));window.addEventListener('resize',layout);
 // Native validation must expose an invalid optional field before focusing it.
 const form=document.getElementById('tradeForm');form.addEventListener('invalid',e=>{const detail=e.target.closest('details');if(detail)detail.open=true;},true);
 // Open additional fields automatically when editing a trade that uses them.
 const editObserver=new MutationObserver(()=>{if(document.getElementById('tradeFormPanel').classList.contains('hidden'))return;const extra=form.querySelector('.optional-fields');if(extra)extra.open=[...extra.querySelectorAll('input,textarea')].some(el=>el.value!=='');});
 editObserver.observe(document.getElementById('tradeFormPanel'),{attributes:true,attributeFilter:['class']});
 document.querySelectorAll('.perf-details').forEach(d=>d.addEventListener('toggle',()=>{window.dispatchEvent(new Event('resize'));}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
