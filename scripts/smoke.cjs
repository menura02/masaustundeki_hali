// Integration test in an isolated Electron profile. Does not touch desktop files.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const syncFS = require('node:fs');
const logfile = path.resolve(__dirname, '../artifacts/smoke.log');
syncFS.mkdirSync(path.dirname(logfile),{recursive:true});
const log = value => syncFS.appendFileSync(logfile,String(value)+'\n');
log('Starting '+new Date().toISOString());
const profile = path.join(os.tmpdir(), 'hali-smoke-' + process.pid);
app.setPath('userData', profile);
process.argv.push('--demo');
const output = path.resolve(__dirname, '../artifacts');
let errors = [];
// Exercise the real IPC/UI with an in-memory OS adapter. Never change this PC's startup registry in tests.
const startupWrites=[];
if(process.argv.includes('--startup-only')){
  let loginState={openAtLogin:false,launchItems:[]};
  app.getLoginItemSettings=()=>loginState;
  app.setLoginItemSettings=settings=>{
    startupWrites.push(settings);
    loginState={openAtLogin:settings.openAtLogin,launchItems:[{name:settings.name,enabled:settings.enabled}]};
  };
  const startupModule=require('../desktop/startup.cjs'),OriginalStartup=startupModule.Startup;
  startupModule.Startup=class extends OriginalStartup{constructor(app,options){super(app,{...options,platform:'win32',demo:false});}};
}
let mouseActive;
ipcMain.on('hali:mouse',(_event,active)=>{mouseActive=active;});
const timeout = setTimeout(() => { log('Smoke test timed out: '+JSON.stringify(errors)); app.exit(1); }, 45000);
app.on('browser-window-created', (_event, win) => {
  log('Window created');
  win.webContents.on('console-message', (_e, level, message) => { if (level === 3) errors.push(message); });
  win.webContents.once('did-finish-load', async () => {
    log('Page loaded');
    try {
      const evaluate = source => win.webContents.executeJavaScript(source);
      await evaluate(`new Promise(resolve=>{const check=()=>document.querySelector('.demo-file')?resolve(true):requestAnimationFrame(check);check();})`);
      log('Demo initialized');
      await evaluate(`window.smokePointers=[];document.addEventListener('pointerdown',e=>window.smokePointers.push({x:e.clientX,y:e.clientY}));`);
      await evaluate(`new Promise(resolve=>{let n=12;const tick=()=>--n?requestAnimationFrame(tick):resolve(true);tick();})`);
      await fs.mkdir(output, { recursive: true });
      await fs.writeFile(path.join(output,'hali-preview.png'),(await win.webContents.capturePage()).toPNG());
      assert.equal(await evaluate(`document.getElementById('file-count').textContent`),'0 saklanan');
      assert.equal(await evaluate(`document.getElementById('toolbar').contains(document.getElementById('counters'))`),true);
      assert.equal(await evaluate(`document.getElementById('file-count').offsetParent===null`),true);
      assert.equal(await evaluate(`getComputedStyle(document.getElementById('resize-frame')).visibility`),'hidden');
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
      if(process.argv.includes('--performance-only')){
        await evaluate(`window.paintCount=0;const originalClear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){window.paintCount++;return originalClear.apply(this,args);};true;`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,1200))`);
        const idle=await evaluate(`window.paintCount`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,500))`);
        assert.equal(await evaluate(`window.paintCount`),idle,'resting rug must stop painting');
        await evaluate(`document.querySelector('[data-theme="indigo"]').click();new Promise(resolve=>setTimeout(resolve,100))`);
        assert.ok(await evaluate(`window.paintCount`)>idle,'changing color must wake the renderer');
        win.hide();await evaluate(`new Promise(resolve=>setTimeout(resolve,200))`);
        const hidden=await evaluate(`window.paintCount`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,300))`);
        assert.equal(await evaluate(`window.paintCount`),hidden,'hidden rug must stop painting');
        win.showInactive();await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
        assert.ok(await evaluate(`window.paintCount`)>hidden,'showing the rug must restore painting');
        assert.deepEqual(errors,[]);
        log('PASS: idle/hidden rug stops painting; theme changes and showing the window resume painting.');
        clearTimeout(timeout);win.destroy();app.exit(0);return;
      }
      if(process.argv.includes('--menu-dismiss-only')){
        const open=async()=>{
          await evaluate(`document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:560,clientY:500,bubbles:true,cancelable:true}));`);
          await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
          assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),false);
        };
        await open();
        await evaluate(`document.getElementById('weight-value').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));`);
        assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),false);
        await evaluate(`document.getElementById('rug').dispatchEvent(new PointerEvent('pointermove',{clientX:20,clientY:20,bubbles:true}));`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,50))`);
        assert.equal(mouseActive,true);
        await evaluate(`document.getElementById('rug').dispatchEvent(new PointerEvent('pointerdown',{clientX:20,clientY:20,bubbles:true,button:0}));`);
        assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,50))`);
        assert.equal(mouseActive,false);
        await open();
        await evaluate(`document.getElementById('rug').dispatchEvent(new PointerEvent('pointerdown',{clientX:450,clientY:450,bubbles:true,button:0}));`);
        assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
        assert.notEqual(await evaluate(`document.getElementById('rug').style.cursor`),'grabbing');
        await open();
        win.emit('blur');
        await evaluate(`new Promise(resolve=>setTimeout(resolve,80))`);
        assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
        await open();
        await evaluate(`document.getElementById('rug').dispatchEvent(new PointerEvent('pointerdown',{clientX:450,clientY:450,bubbles:true,button:2}));document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:450,clientY:450,bubbles:true,cancelable:true}));`);
        assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
        log('PASS: menu retains input outside, closes on outside left/right clicks and native blur; inside clicks stay open, outside click does not grab rug.');
        clearTimeout(timeout);win.destroy();app.exit(0);return;
      }
      if(process.argv.includes('--startup-only')){
        assert.equal(startupWrites.length,0);
        assert.equal(await evaluate(`document.getElementById('startup-toggle').checked`),false);
        assert.equal(await evaluate(`document.getElementById('startup-toggle').disabled`),false);
        await evaluate(`document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:560,clientY:500,bubbles:true,cancelable:true}));`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
        await evaluate(`document.getElementById('startup-toggle').click()`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
        assert.equal(await evaluate(`document.getElementById('startup-toggle').checked`),true);
        assert.equal(startupWrites.at(-1).openAtLogin,true);
        await fs.writeFile(path.join(output,'hali-startup.png'),(await win.webContents.capturePage()).toPNG());
        await evaluate(`document.getElementById('startup-toggle').click()`);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,100))`);
        assert.equal(await evaluate(`document.getElementById('startup-toggle').checked`),false);
        assert.equal(startupWrites.at(-1).openAtLogin,false);
        log('PASS: startup opt-in, checkbox enable/disable and real IPC with mocked OS; registry untouched.');
        clearTimeout(timeout);win.destroy();app.exit(0);return;
      }
      if(process.argv.includes('--counters-only')){
        await evaluate(`document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:560,clientY:500,bubbles:true,cancelable:true}));`);
        assert.equal(await evaluate(`document.getElementById('file-count').offsetParent===null`),false);
        assert.equal(await evaluate(`document.getElementById('toolbar').contains(document.getElementById('icon-count'))`),true);
        await evaluate(`new Promise(resolve=>setTimeout(resolve,200))`);
        await fs.writeFile(path.join(output,'hali-context-menu.png'),(await win.webContents.capturePage()).toPNG());
        await evaluate(`document.getElementById('file-count').click()`);
        assert.equal(await evaluate(`document.getElementById('drawer').hidden`),false);
        assert.equal(await evaluate(`document.getElementById('file-count').offsetParent===null`),true);
        log('PASS: counters hidden at rest, visible in context menu, file list opens.');
        clearTimeout(timeout);win.destroy();app.exit(0);return;
      }
      const center=await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
      win.webContents.sendInputEvent({type:'mouseMove',...center});
      win.webContents.sendInputEvent({type:'mouseDown',...center,button:'left',clickCount:1});
      win.webContents.sendInputEvent({type:'mouseMove',x:center.x+80,y:center.y+30});
      await evaluate(`new Promise(resolve=>{let n=24;const tick=()=>--n?requestAnimationFrame(tick):resolve(true);tick();})`);
      assert.equal(await evaluate(`document.getElementById('hint').textContent`),'Yavaşça bırak. Halı yerini bulur.');
      assert.equal(await evaluate(`document.body.classList.contains('resize-mode')`),false);
      await fs.writeFile(path.join(output,'hali-center-drag.png'),(await win.webContents.capturePage()).toPNG());
      win.webContents.sendInputEvent({type:'mouseUp',x:center.x+80,y:center.y+30,button:'left',clickCount:1});
      await evaluate(`document.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));`);
      const afterCenter=await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
      assert.ok(Math.hypot(afterCenter.x-center.x,afterCenter.y-center.y)>4);
      await evaluate(`document.getElementById('reset').click();new Promise(resolve=>{let n=100;const tick=()=>--n?requestAnimationFrame(tick):resolve(true);tick();})`);
      await evaluate(`document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:560,clientY:500,bubbles:true,cancelable:true}));`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),false);
      assert.equal(await evaluate(`document.getElementById('file-count').offsetParent===null`),false);
      await evaluate(`document.querySelector('[data-theme="indigo"]').click();document.getElementById('drawer-toggle').click()`);
      assert.equal(await evaluate(`document.querySelector('[data-theme="indigo"]').getAttribute('aria-pressed')`),'true');
      assert.equal(await evaluate(`document.getElementById('drawer').hidden`),false);
      await evaluate(`document.getElementById('drawer-close').click();const dt=new DataTransfer();dt.setData('text/plain','demo-1');document.dispatchEvent(new DragEvent('drop',{clientX:560,clientY:500,dataTransfer:dt,bubbles:true}));`);
      assert.equal(await evaluate(`document.getElementById('file-count').textContent`),'1 saklanan');
      await evaluate(`document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:560,clientY:500,bubbles:true,cancelable:true}));`);
      await evaluate(`document.getElementById('file-count').click()`);
      await evaluate(`(()=>{const r=document.getElementById('restore-all').getBoundingClientRect(),o={clientX:r.x+10,clientY:r.y+10,bubbles:true};document.getElementById('restore-all').dispatchEvent(new PointerEvent('pointermove',o));document.getElementById('restore-all').dispatchEvent(new PointerEvent('pointerdown',o));})()`);
      await evaluate(`new Promise(resolve=>setTimeout(resolve,50))`);
      assert.equal(mouseActive,true);
      await fs.writeFile(path.join(output,'hali-files.png'),(await win.webContents.capturePage()).toPNG());
      await evaluate(`document.getElementById('restore-all').click()`);
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      assert.equal(await evaluate(`document.getElementById('file-count').textContent`),'0 saklanan');
      assert.equal(await evaluate(`document.querySelectorAll('.demo-file').length`),4);
      await evaluate(`document.getElementById('drawer-close').click();document.querySelector('[data-theme="wine"]').click()`);
      // Grab a fabric corner, sweep it inward, capture while lifted, then release.
      const corner = await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {x:Math.round(r.x+2),y:Math.round(r.y+2)};})()`);
      log('Initial '+JSON.stringify({corner,viewport:await evaluate(`({w:innerWidth,h:innerHeight,dpr:devicePixelRatio})`)}));
      win.webContents.sendInputEvent({type:'mouseMove',...corner});
      win.webContents.sendInputEvent({type:'mouseDown',...corner,button:'left',clickCount:1});
      for(let i=0;i<12;i++) {
        win.webContents.sendInputEvent({type:'mouseMove',x:corner.x+i*14,y:corner.y+i*9,movementX:14,movementY:9});
        await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      }
      assert.equal(await evaluate(`document.getElementById('hint').textContent`),'Yavaşça bırak. Halı yerini bulur.');
      assert.equal(await evaluate(`document.body.classList.contains('resize-mode')`),false);
      await fs.writeFile(path.join(output,'hali-fold.png'),(await win.webContents.capturePage()).toPNG());
      win.webContents.sendInputEvent({type:'mouseUp',x:corner.x+154,y:corner.y+99,button:'left',clickCount:1});
      // Electron's offscreen input can lose native capture during capturePage.
      // Also exercise the document-level release used when another element takes capture.
      await evaluate(`document.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));`);
      await evaluate(`document.getElementById('reset').click();new Promise(resolve=>{let n=100;const tick=()=>--n?requestAnimationFrame(tick):resolve(true);tick();})`);
      await evaluate(`document.getElementById('resize-toggle').click()`);
      assert.equal(await evaluate(`getComputedStyle(document.getElementById('resize-frame')).visibility`),'visible');
      assert.equal(await evaluate(`document.getElementById('resize-help').hidden`),false);
      const original = await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
      const resizeCorner={x:Math.round(original.x+original.width),y:Math.round(original.y+original.height)};
      win.webContents.sendInputEvent({type:'mouseMove',...resizeCorner});
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      win.webContents.sendInputEvent({type:'mouseDown',...resizeCorner,button:'left',clickCount:1});
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      win.webContents.sendInputEvent({type:'mouseMove',x:resizeCorner.x+100,y:resizeCorner.y-40});
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      win.webContents.sendInputEvent({type:'mouseUp',x:resizeCorner.x+100,y:resizeCorner.y-40,button:'left',clickCount:1});
      await evaluate(`document.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,bubbles:true}));`);
      const resized=await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
      log('Resize '+JSON.stringify({original,resized,resizeCorner,pointers:await evaluate(`window.smokePointers`),hint:await evaluate(`document.getElementById('hint').textContent`)}));
      assert.ok(Math.abs(resized.width-original.width-100)<2);
      assert.ok(Math.abs(resized.height-original.height+40)<2);
      assert.ok(Math.abs(resized.x-original.x)<1&&Math.abs(resized.y-original.y)<1);
      await fs.writeFile(path.join(output,'hali-resize-mode.png'),(await win.webContents.capturePage()).toPNG());
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
      assert.equal(await evaluate(`document.body.classList.contains('resize-mode')`),false);
      await evaluate(`document.getElementById('resize-toggle').click();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));`);
      assert.equal(await evaluate(`document.body.classList.contains('resize-mode')`),false);
      await evaluate(`document.getElementById('resize-toggle').click();document.getElementById('rug').dispatchEvent(new PointerEvent('pointerdown',{clientX:20,clientY:20,button:0,bubbles:true}));`);
      assert.equal(await evaluate(`document.body.classList.contains('resize-mode')`),false);
      await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
      const settings=JSON.parse(await fs.readFile(path.join(profile,'rug.json'),'utf8'));
      const viewport=await evaluate(`({width:innerWidth,height:innerHeight})`);
      log('Settings '+JSON.stringify({settings,viewport}));
      assert.ok(Math.abs(settings.w-resized.width/viewport.width)<.002);
      assert.ok(Math.abs(settings.h-resized.height/viewport.height)<.002);
      await fs.writeFile(path.join(output,'hali-resized.png'),(await win.webContents.capturePage()).toPNG());
      // Movement never reveals controls; only an explicit context menu action does.
      win.webContents.sendInputEvent({type:'mouseMove',x:40,y:100});
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
      await fs.writeFile(path.join(output,'hali-idle.png'),(await win.webContents.capturePage()).toPNG());
      win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(resized.x+resized.width/2),y:Math.round(resized.y+resized.height/2)});
      await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
      await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));})()`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),false);
      await evaluate(`new Promise(resolve=>{let n=12;const tick=()=>--n?requestAnimationFrame(tick):resolve(true);tick();})`);
      assert.equal(await evaluate(`document.getElementById('weight').value`),'50');
      await evaluate(`const weightSlider=document.getElementById('weight');weightSlider.value='83';weightSlider.dispatchEvent(new Event('input',{bubbles:true}));`);
      assert.equal(await evaluate(`document.getElementById('weight-value').textContent`),'Ağır · 83');
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),false);
      await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);
      assert.equal(JSON.parse(await fs.readFile(path.join(profile,'rug.json'),'utf8')).weight,83);
      await fs.writeFile(path.join(output,'hali-context-menu.png'),(await win.webContents.capturePage()).toPNG());
      await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
      await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();document.getElementById('rug').dispatchEvent(new MouseEvent('contextmenu',{clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));})()`);
      win.webContents.sendInputEvent({type:'mouseMove',x:40,y:100});
      await evaluate(`new Promise(resolve=>setTimeout(resolve,3300))`);
      assert.equal(await evaluate(`document.getElementById('toolbar').hidden`),true);
      const reloaded=new Promise(resolve=>win.webContents.once('did-finish-load',resolve));win.webContents.reload();await reloaded;
      await evaluate(`new Promise(resolve=>{const check=()=>document.querySelector('.demo-file')?resolve(true):requestAnimationFrame(check);check();})`);
      const restoredSize=await evaluate(`(()=>{const r=document.getElementById('resize-frame').getBoundingClientRect();return {width:r.width,height:r.height};})()`);
      assert.ok(Math.abs(restoredSize.width-resized.width)<2&&Math.abs(restoredSize.height-resized.height)<2);
      assert.equal(await evaluate(`document.getElementById('weight').value`),'83');
      assert.equal(await evaluate(`document.getElementById('weight').getAttribute('aria-valuetext')`),'Ağır, 83 / 100');
      assert.deepEqual(errors,[]);
      console.log('PASS: physical center and outer-corner grips, explicit resize mode, Escape/Enter/outside exit, file roundtrip and persisted settings.');
      log('PASS');
      clearTimeout(timeout);win.destroy();app.exit(0);
    } catch(error) { log(error.stack);console.error(error);clearTimeout(timeout);app.exit(1); }
  });
});
require('../desktop/main.cjs');
