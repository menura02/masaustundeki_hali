import { Cloth } from './cloth.mjs';
import { texture } from './texture.mjs';
import { resizeEdge, resizeBounds } from './resize.mjs';
import { coveredIcons } from './coverage.mjs';
const $ = id => document.getElementById(id);
const api = window.hali;
let config = api ? await api.init() : { demo: true, entries: [], settings: {} };
const demo = config.demo;
let entries = config.entries, theme = config.settings.theme || 'wine';
let weight=Number.isFinite(config.settings.weight)?Math.max(0,Math.min(100,config.settings.weight)):50;
let rugTexture = texture(theme), cloth, width, height, drag = null, lastActive = null, toastTimer, awakeUntil = performance.now()+3000;
let controlsTimer, pointer={x:-1,y:-1};
let resizeMode=false;
let suppressContextMenuUntil=0;
let startupState=config.startup??{supported:false,enabled:false},startupBusy=false;
function syncStartup(){
  $('startup-control').hidden=!['win32','darwin'].includes(config.platform);
  $('startup-label').textContent=config.platform==='darwin'?'macOS ile birlikte başlat':'Windows ile birlikte başlat';
  $('startup-toggle').checked=startupState.enabled||Boolean(startupState.requiresApproval);
  $('startup-toggle').disabled=!startupState.supported||startupBusy;
  const note=startupState.requiresApproval?'macOS onayı bekleniyor. Oturum açma ayarlarından Halı’ya izin verin.':demo?'Önizlemede kullanılamaz.':startupState.reason==='packaged-required'?'macOS otomatik başlangıcı kurulu .app sürümünde kullanılabilir.':'';
  $('startup-note').textContent=note;$('startup-note').hidden=!note;
  $('startup-settings').hidden=!startupState.requiresApproval;
  fitControls();
}
async function refreshStartup(){
  if(!api?.startupStatus||!['win32','darwin'].includes(config.platform)||startupBusy)return;
  startupBusy=true;syncStartup();
  try{startupState=await api.startupStatus();}catch(error){notify(error.message);}
  finally{startupBusy=false;syncStartup();}
}
$('startup-toggle').addEventListener('change',async()=>{
  if(startupBusy)return;
  const enabled=$('startup-toggle').checked;startupBusy=true;syncStartup();
  try{startupState=await api.setStartup(enabled);notify(startupState.requiresApproval?'macOS oturum açma ayarlarında onay gerekiyor.':startupState.enabled?'Oturum açıldığında Halı da başlayacak.':'Otomatik başlatma kapatıldı.');}
  catch(error){try{startupState=await api.startupStatus();}catch{}notify(error.message);}
  finally{startupBusy=false;syncStartup();showControls();}
});
$('startup-settings').onclick=async()=>{try{await api.startupSettings();}catch(error){notify(error.message);}};
let desktopState={available:false,icons:[]},coveredNames='';
function updateCoverage(){
  if(!cloth)return;
  const covered=coveredIcons(cloth,desktopState.icons);
  $('icon-count').textContent=desktopState.available?`${covered.length} kapalı simge`:'Simge sayacı kullanılamıyor';
  $('icons-retry').hidden=demo||desktopState.available;
  fitControls();
  const key=JSON.stringify([desktopState.available,covered.map(p=>p.name)]);
  if(key===coveredNames)return;
  coveredNames=key;$('covered-icons').replaceChildren();
  for(const p of covered){const row=document.createElement('div');row.textContent=p.name;$('covered-icons').append(row);}
  if(!covered.length)$('covered-icons').textContent=desktopState.available?'Halının altında masaüstü simgesi yok.':desktopState.permissionRequired?'Finder erişimi gerekiyor. Sistem Ayarları → Gizlilik ve Güvenlik → Otomasyon bölümünden izin verip yeniden deneyin.':'Masaüstü simgeleri okunamadı.';
}
$('icons-retry').onclick=async()=>{
  $('icons-retry').disabled=true;
  try{desktopState=await api.retryIcons();coveredNames='';updateCoverage();notify(desktopState.available?'Masaüstü simgeleri okunuyor.':'Simge erişimini kontrol edip yeniden deneyin.');}
  catch(error){notify(error.message);}finally{$('icons-retry').disabled=false;}
};
async function pollIcons(){
  if(demo||!api?.icons){$('icon-count').hidden=true;return;}
  try{desktopState=await api.icons();}catch{desktopState={available:false,icons:[]};}
  updateCoverage();setTimeout(pollIcons,700);
}
function wake(){awakeUntil=performance.now()+6000;}
function edgeAt(x,y){
  if(!resizeMode)return '';
  const edge=resizeEdge(cloth,x,y);
  return edge;
}
function setResizeMode(active){
  if(drag)release({pointerId:drag.pointerId});
  resizeMode=active;document.body.classList.toggle('resize-mode',active);
  $('resize-help').hidden=!active;$('resize-toggle').setAttribute('aria-pressed',String(active));
  if(active){cloth.flatten();wake();}
  closeControls();positionUI();save();
}
function showControls(){
  if($('toolbar').hidden)return;
  clearTimeout(controlsTimer);controlsTimer=setTimeout(hideControls,3000);
}
function hideControls(){
  if($('toolbar').matches(':hover')||$('toolbar').contains(document.activeElement)){
    controlsTimer=setTimeout(hideControls,3000);return;
  }
  closeControls();
}
function closeControls(){
  const wasOpen=!$('toolbar').hidden;
  clearTimeout(controlsTimer);$('toolbar').hidden=true;
  if(wasOpen)api?.menuOpen?.(false);
  activeMouse(cloth.contains(pointer.x,pointer.y)||Boolean(edgeAt(pointer.x,pointer.y))||isUI(document.elementFromPoint(pointer.x,pointer.y)));
}
function fitControls(){
  if($('toolbar').hidden)return;
  const r=$('toolbar').getBoundingClientRect();
  $('toolbar').style.left=`${Math.max(12,Math.min(width-r.width-12,r.x))}px`;
  $('toolbar').style.top=`${Math.max(12,Math.min(height-r.height-12,r.y))}px`;
}
function openControls(x,y){
  refreshStartup();
  $('toolbar').hidden=false;
  const r=$('toolbar').getBoundingClientRect();
  $('toolbar').style.left=`${Math.max(12,Math.min(width-r.width-12,x+10))}px`;
  $('toolbar').style.top=`${Math.max(12,Math.min(height-r.height-12,y+10))}px`;
  activeMouse(true);showControls();
  api?.menuOpen?.(true);
}
const canvas = $('rug'), ctx = canvas.getContext('2d');
const samples = [
  {id:'demo-1',name:'son_final_v3.pdf',type:'PDF',x:.79,y:.38},
  {id:'demo-2',name:'ilhamlar',type:'folder',x:.85,y:.56},
  {id:'demo-3',name:'bir fikir.txt',type:'TXT',x:.71,y:.68},
  {id:'demo-4',name:'tatil-planı.pdf',type:'PDF',x:.86,y:.77}
];
if(demo){$('room').hidden=false;$('storage-note').textContent='Önizlemede örnek dosyalar kullanılır. Gerçek dosyalarınız değişmez.';}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function save(){api?.save({theme,weight,x:(cloth.x+cloth.width/2)/width,y:(cloth.y+cloth.height/2)/height,w:cloth.width/width,h:cloth.height/height});}
function makeCloth(center,size){
  const top=demo?Math.max(280,height*.42):30;
  const defaultW=Math.min(570,width*.52,Math.max(150,height-top-135)*840/600);
  const w=Math.max(180,Math.min(width-40,size?.w??defaultW)),h=Math.max(125,Math.min(height-40,size?.h??defaultW*600/840));
  cloth=new Cloth(w,h,Math.max(20,Math.min(width-w-20,(center?.x??width*.47)-w/2)),Math.max(20,Math.min(height-h-20,(center?.y??(demo?top+h/2:height*.5))-h/2)));
  cloth.bumps=entries;
  cloth.setWeight(weight/100);
  wake();
}
function resize(){
  const size=cloth?{w:cloth.width/width*innerWidth,h:cloth.height/height*innerHeight}:config.settings.w&&config.settings.h?{w:config.settings.w*innerWidth,h:config.settings.h*innerHeight}:null;
  const center=cloth?{x:(cloth.x+cloth.width/2)/width*innerWidth,y:(cloth.y+cloth.height/2)/height*innerHeight}:config.settings.x?{x:config.settings.x*innerWidth,y:config.settings.y*innerHeight}:null;
  width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);makeCloth(center,size);positionUI();renderSamples();
}
function positionUI(){
  const x=Math.max(165,Math.min(width-165,cloth.x+cloth.width/2));
  const y=Math.min(height-85,cloth.y+cloth.height+24);
  $('hint').style.left=`${x-150}px`;$('hint').style.top=`${y+55}px`;
  Object.assign($('resize-frame').style,{left:`${cloth.x}px`,top:`${cloth.y}px`,width:`${cloth.width}px`,height:`${cloth.height}px`});
  Object.assign($('resize-help').style,{left:`${Math.max(160,Math.min(width-160,cloth.x+cloth.width/2))}px`,top:`${Math.max(10,Math.min(height-48,cloth.y+cloth.height+12))}px`});
}
function update(data){const added=data.filter(item=>!entries.some(e=>e.id===item.id));entries=data;cloth.bumps=entries;for(const item of added)cloth.ripple(item.u,item.v,4);wake();$('file-count').textContent=`${entries.length} saklanan`;$('drawer-number').textContent=String(entries.length).padStart(2,'0');renderDrawer();renderSamples();showControls();}
function renderDrawer(){
  $('entries').replaceChildren();
  if(!entries.length){const p=document.createElement('p');p.className='empty';p.textContent='Şimdilik yalnızca huzur var.';$('entries').append(p);}
  for(const entry of entries){
    const row=document.createElement('div');row.className='entry';
    const icon=document.createElement('span');icon.className='entry-icon';icon.textContent='▤';
    const label=document.createElement('span');label.className='entry-name';label.textContent=entry.name;label.title=entry.name;
    const button=document.createElement('button');button.textContent='↗';button.title='Masaüstüne geri koy';button.setAttribute('aria-label',`${entry.name} masaüstüne geri koy`);
    button.onclick=async()=>{button.disabled=true;try{await restore(entry.id);}catch(e){notify(e.message);}finally{button.disabled=false;}};
    row.append(icon,label,button);$('entries').append(row);
  }
  $('restore-all').disabled=!entries.length;
}
async function restore(id){
  if(demo){update(entries.filter(e=>e.id!==id));}
  else update(await api.restore(id));
}
function renderSamples(){
  if(!demo)return;
  $('demo-files').replaceChildren();
  for(const sample of samples.filter(s=>!entries.some(e=>e.id===s.id))){
    const el=document.createElement('div');el.className='demo-file interactive';el.draggable=true;el.dataset.id=sample.id;el.style.left=`${sample.x*width}px`;el.style.top=`${sample.y*height}px`;
    const icon=document.createElement('div');icon.className='file-shape'+(sample.type==='folder'?' folder':'');icon.textContent=sample.type==='folder'?'':sample.type;
    const label=document.createElement('div');label.className='file-label';label.textContent=sample.name;
    el.append(icon,label);el.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',sample.id);event.dataTransfer.effectAllowed='move';});$('demo-files').append(el);
  }
}
function drawer(open){$('drawer').hidden=!open;closeControls();if(open)activeMouse(true);}
$('drawer-toggle').onclick=()=>drawer($('drawer').hidden);
$('file-count').onclick=()=>drawer($('drawer').hidden);
$('icon-count').onclick=()=>drawer($('drawer').hidden);
$('drawer-close').onclick=()=>drawer(false);
$('resize-toggle').onclick=()=>setResizeMode(!resizeMode);
$('resize-done').onclick=()=>setResizeMode(false);
$('reset').onclick=()=>{cloth.flatten();wake();closeControls();notify('Biraz düzeldi.');};
$('restore-all').onclick=async()=>{
  $('restore-all').disabled=true;
  try{for(const entry of [...entries])await restore(entry.id);notify('Hepsi yeniden masaüstünde.');}catch(e){notify(e.message);}finally{$('restore-all').disabled=!entries.length;}
};
document.querySelectorAll('[data-theme]').forEach(button=>button.onclick=()=>{theme=button.dataset.theme;rugTexture=texture(theme);wake();syncTheme();save();closeControls();});
function syncTheme(){document.querySelectorAll('[data-theme]').forEach(b=>{b.classList.toggle('active',b.dataset.theme===theme);b.setAttribute('aria-pressed',String(b.dataset.theme===theme));});}
function syncWeight(){
  $('weight').value=String(weight);
  const label=weight<34?'Hafif':weight>66?'Ağır':'Dengeli';
  $('weight-value').textContent=`${label} · ${weight}`;
  $('weight').setAttribute('aria-valuetext',`${label}, ${weight} / 100`);
}
$('weight').addEventListener('input',()=>{
  weight=Number($('weight').value);cloth.setWeight(weight/100);syncWeight();wake();showControls();save();
});
$('weight').addEventListener('pointerup',()=>{$('weight').blur();showControls();});
function isUI(target){return target instanceof Element&&Boolean(target.closest('.interactive'));}
function activeMouse(active){const capture=Boolean(active||!$('toolbar').hidden);if(lastActive!==capture){api?.mouse(capture);lastActive=capture;}}
document.addEventListener('pointermove',event=>{
  pointer={x:event.clientX,y:event.clientY};
  if(drag){
    wake();showControls();
    if(drag.type==='resize'){
      const bounds=resizeBounds(drag.bounds,drag.edge,event.clientX-drag.x,event.clientY-drag.y,{width,height});
      cloth.resize(bounds.width,bounds.height,bounds.x,bounds.y);positionUI();return;
    }
    cloth.grab.x=event.clientX+drag.offsetX;cloth.grab.y=event.clientY+drag.offsetY;
    cloth.grab.z=drag.initialLift+Math.min(150,Math.hypot(event.clientX-drag.x,event.clientY-drag.y)*.65)*cloth.motion.lift;
    return;
  }
  const onRug=cloth.contains(event.clientX,event.clientY);
  const edge=edgeAt(event.clientX,event.clientY);
  if(isUI(event.target))showControls();
  activeMouse(onRug||Boolean(edge)||isUI(event.target));
  canvas.style.cursor=edge?`${edge}-resize`:onRug&&!resizeMode?'grab':'default';
});
canvas.addEventListener('pointerdown',event=>{
  const resize=edgeAt(event.clientX,event.clientY);
  if(event.button!==0||(!resize&&!cloth.contains(event.clientX,event.clientY)))return;
  if(resizeMode&&!resize)return;
  closeControls();
  const near=cloth.nearest(event.clientX,event.clientY),p=near.point;
  const projected=cloth.project(p);
  drag={type:resize?'resize':'fold',pointerId:event.pointerId,x:event.clientX,y:event.clientY,
    offsetX:projected.x-event.clientX,offsetY:projected.y-event.clientY,initialLift:p.z,
    edge:resize,bounds:{x:cloth.x,y:cloth.y,width:cloth.width,height:cloth.height}};
  cloth.flattening=false;
  if(!resize)cloth.grab={index:near.index,x:projected.x,y:projected.y,z:p.z};
  wake();showControls();
  canvas.style.cursor=resize?`${resize}-resize`:'grabbing';
  canvas.setPointerCapture(event.pointerId);activeMouse(true);$('hint').textContent=resize?'Tam istediğin kadar yer.':'Yavaşça bırak. Halı yerini bulur.';
});
function release(event){if(!drag)return;const id=event.pointerId??drag.pointerId;const folded=drag.type==='fold';drag=null;if(folded)cloth.settle();else cloth.grab=null;if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);canvas.style.cursor=resizeMode?'default':'grab';positionUI();wake();save();$('hint').textContent='Herhangi bir noktadan tut. Boyutlandırmak için sağ tıkla.';}
// A drop or another desktop element may take pointer capture away from the canvas.
document.addEventListener('pointerup',release);
document.addEventListener('pointercancel',release);
window.addEventListener('blur',()=>{if(drag)release({pointerId:drag.pointerId});closeControls();});
document.addEventListener('pointerdown',event=>{
  if($('toolbar').hidden||$('toolbar').contains(event.target))return;
  pointer={x:event.clientX,y:event.clientY};
  if(event.button===2)suppressContextMenuUntil=performance.now()+500;
  closeControls();
  if(resizeMode&&!isUI(event.target)&&!cloth.contains(pointer.x,pointer.y)&&!edgeAt(pointer.x,pointer.y))setResizeMode(false);
  // The first outside click dismisses the menu, without grabbing fabric underneath.
  event.preventDefault();event.stopPropagation();
},true);
document.addEventListener('contextmenu',event=>{
  if(performance.now()<suppressContextMenuUntil){event.preventDefault();event.stopPropagation();}
},true);
canvas.addEventListener('contextmenu',event=>{if(!cloth.contains(event.clientX,event.clientY))return;event.preventDefault();openControls(event.clientX,event.clientY);});
document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#toolbar'))closeControls();
  if(resizeMode&&!isUI(event.target)&&!cloth.contains(event.clientX,event.clientY)&&!edgeAt(event.clientX,event.clientY))setResizeMode(false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();openControls(cloth.x+cloth.width/2,cloth.y+cloth.height/2);$('drawer-toggle').focus();}
  if(resizeMode&&(event.key==='Enter'||event.key==='Escape')){event.preventDefault();setResizeMode(false);return;}
  if(event.key==='Escape'){drawer(false);if(drag)release({pointerId:drag.pointerId});closeControls();wake();}
});
document.addEventListener('focusin',showControls);
document.addEventListener('focusout',showControls);
document.addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect=cloth.contains(event.clientX,event.clientY)?'move':'none';});
document.addEventListener('drop',async event=>{
  event.preventDefault();if(!cloth.contains(event.clientX,event.clientY))return;
  const near=cloth.nearest(event.clientX,event.clientY),position={u:near.point.u,v:near.point.v};
  try{
    if(demo){const id=event.dataTransfer.getData('text/plain'),sample=samples.find(s=>s.id===id);if(!sample)return;update([...entries,{id,name:sample.name,...position}]);notify('Gözden uzak. Hâlâ burada.');}
    else{update(await api.stash(Array.from(event.dataTransfer.files),position));notify('Halının altında güvende.');}
  }catch(error){notify(error.message);}
});
api?.onUpdate(data=>update(data));
api?.onAction(name=>{if(name==='drawer')drawer(true);if(name==='reset')$('reset').click();if(name==='dismiss-menu')closeControls();});
window.addEventListener('resize',resize);
// Affine texture mapping on a triangulated cloth mesh.
function drawTriangle(tri){
  const projected=tri.map(p=>cloth.project(p));
  const [a,b,c]=projected,[s,t,u]=tri.map(p=>({x:p.u*rugTexture.width,y:p.v*rugTexture.height}));
  const det=(t.x-s.x)*(u.y-s.y)-(u.x-s.x)*(t.y-s.y);if(Math.abs(det)<.001)return;
  const m11=((b.x-a.x)*(u.y-s.y)-(c.x-a.x)*(t.y-s.y))/det;
  const m12=((b.y-a.y)*(u.y-s.y)-(c.y-a.y)*(t.y-s.y))/det;
  const m21=((c.x-a.x)*(t.x-s.x)-(b.x-a.x)*(u.x-s.x))/det;
  const m22=((c.y-a.y)*(t.x-s.x)-(b.y-a.y)*(u.x-s.x))/det;
  ctx.save();ctx.beginPath();
  const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3;
  for(let i=0;i<3;i++){const p=projected[i],dx=p.x-mx,dy=p.y-my,l=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](p.x+dx/l*.45,p.y+dy/l*.45);}
  ctx.closePath();ctx.clip();ctx.transform(m11,m12,m21,m22,a.x-m11*s.x-m21*s.y,a.y-m12*s.x-m22*s.y);ctx.drawImage(rugTexture,0,0);ctx.restore();
  // Interpolate lighting from shared vertex normals: no dark triangular facets.
  const shades=tri.map((p,i)=>({shade:p.shade??0,p:projected[i]})).sort((a,b)=>a.shade-b.shade);
  if(shades[2].shade>.015){
    const lo=shades[0],hi=shades[2];
    const gradient=ctx.createLinearGradient(lo.p.x,lo.p.y,hi.p.x+.01,hi.p.y+.01);
    gradient.addColorStop(0,`rgba(15,12,8,${lo.shade})`);gradient.addColorStop(1,`rgba(15,12,8,${hi.shade})`);
    ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.fill();
  }
}
let previous=0,accumulator=0;
function animate(now){
  if(now>awakeUntil&&!drag){previous=now;requestAnimationFrame(animate);return;}
  const elapsed=Math.min(50,now-previous);previous=now;accumulator+=elapsed;
  while(accumulator>=1000/60){
    cloth.step();accumulator-=1000/60;
  }
  positionUI();
  ctx.clearRect(0,0,width,height);
  const triangles=cloth.triangles();
  for(let j=0;j<=cloth.rows;j++)for(let i=0;i<=cloth.cols;i++){
    const p=cloth.points[j*(cloth.cols+1)+i];
    const l=cloth.points[j*(cloth.cols+1)+Math.max(0,i-1)],r=cloth.points[j*(cloth.cols+1)+Math.min(cloth.cols,i+1)];
    const t=cloth.points[Math.max(0,j-1)*(cloth.cols+1)+i],b=cloth.points[Math.min(cloth.rows,j+1)*(cloth.cols+1)+i];
    const ax=r.x-l.x,ay=r.y-l.y,az=r.z-l.z,bx=b.x-t.x,by=b.y-t.y,bz=b.z-t.z;
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,length=Math.hypot(nx,ny,nz)||1;
    p.shade=Math.max(0,Math.min(.48,.81-(nx*-.3+ny*-.4+Math.abs(nz)*.866)/length));
  }
  // A single silhouette casts a soft shadow; avoid per-triangle shadow seams.
  const boundary=[];for(let i=0;i<=cloth.cols;i++)boundary.push(cloth.points[i]);
  for(let j=1;j<=cloth.rows;j++)boundary.push(cloth.points[j*(cloth.cols+1)+cloth.cols]);
  for(let i=cloth.cols-1;i>=0;i--)boundary.push(cloth.points[cloth.rows*(cloth.cols+1)+i]);
  for(let j=cloth.rows-1;j>0;j--)boundary.push(cloth.points[j*(cloth.cols+1)]);
  const lift=Math.max(...boundary.map(p=>p.z));
  ctx.save();ctx.shadowColor='#22271955';ctx.shadowBlur=14+lift*.13;ctx.shadowOffsetY=9+lift*.08;ctx.fillStyle='#30291f60';ctx.beginPath();boundary.forEach((p,i)=>{const q=cloth.project(p);ctx[i?'lineTo':'moveTo'](q.x,q.y);});ctx.closePath();ctx.fill();ctx.restore();
  triangles.forEach(drawTriangle);
  // Short cotton fringe follows the deformed left and right selvedges.
  ctx.strokeStyle='#cbbb98';ctx.lineWidth=1.4;
  for(let side=0;side<2;side++)for(let j=0;j<cloth.rows;j++)for(let k=0;k<3;k++){
    const a=cloth.project(cloth.points[j*(cloth.cols+1)+(side?cloth.cols:0)]),b=cloth.project(cloth.points[(j+1)*(cloth.cols+1)+(side?cloth.cols:0)]),t=k/3,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(side?8:-8),y+2);ctx.stroke();
  }
  requestAnimationFrame(animate);
}
resize();update(entries);syncTheme();syncWeight();syncStartup();pollIcons();requestAnimationFrame(animate);
