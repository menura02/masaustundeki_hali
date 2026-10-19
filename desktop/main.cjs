const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { Vault } = require('./vault.cjs');
const { Startup } = require('./startup.cjs');
const { WindowsDesktop } = require('./windows-desktop.cjs');
const {createMover}=require('./move.cjs');
const {SettingsStore}=require('./settings.cjs');
const packageSmoke=process.argv.includes('--package-smoke');
const demo = process.argv.includes('--demo')||packageSmoke;
if(packageSmoke){
  const fs=require('node:fs'),os=require('node:os');
  app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hali-package-smoke-')));
}
let win, tray, vault, settings = {}, nativeLayer, settingsStore, quitting=false,flushing=false;
let windowsDesktop;
let platformStatus={state:demo?'demo':'starting',message:''};
function reportPlatform(state,message=''){
  platformStatus={state,message};
  if(win&&!win.isDestroyed())win.webContents.send('hali:platform',platformStatus);
}
let contextMenuOpen = false;
const uiURL = pathToFileURL(path.join(__dirname, '../ui/index.html')).href;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { win?.show(); win?.webContents.send('hali:command', 'drawer'); });
  app.whenReady().then(boot).catch(error => { dialog.showErrorBox('Halı başlatılamadı', error.message); app.quit(); });
}
function trusted(event) { return event.sender === win?.webContents && event.senderFrame?.url.split('?')[0] === uiURL; }
function publish() { win.webContents.send('hali:update', vault.list()); }
function attachDesktop() {
  if (nativeLayer && !demo){try{nativeLayer.attach(win.getNativeWindowHandle(),contextMenuOpen);reportPlatform('ready');}catch{reportPlatform('fallback','Masaüstü katmanı kullanılamıyor; halı normal pencere olarak çalışıyor.');}}
  windowsDesktop?.setInteractive(contextMenuOpen);
}
async function boot() {
  const startup = new Startup(app, { demo });
  if (!demo) vault = await new Vault(app.getPath('desktop'),{moveExclusive:createMover({directory:path.join(app.getPath('userData'),'desktop-layer'),resources:app.isPackaged?process.resourcesPath:undefined})}).init();
  if (!demo && process.platform === 'win32') execFile('attrib.exe', ['+H', vault.root], { windowsHide: true }, error => { if (error) console.warn(error.message); });
  const settingsPath = path.join(app.getPath('userData'), 'rug.json');
  settingsStore=new SettingsStore(settingsPath);settings=await settingsStore.load();
  if (process.platform === 'darwin' && !demo) {
    try { nativeLayer = require('../native/build/desktop.node'); }
    catch {reportPlatform('fallback','Masaüstü katmanı yüklenemedi. Güvenli dosya taşıma için yerel modülün derlenmesi gerekiyor.');}
    app.dock?.hide();
  }
  const display = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    ...(demo ? { width: 1200, height: 820, minWidth: 760, minHeight: 600 } : display.bounds),
    title: 'Halı', transparent: !demo, frame: demo, backgroundColor: '#00000000',
    hasShadow: false, resizable: demo, skipTaskbar: !demo, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.on('blur', () => {
    if (!contextMenuOpen) return;
    contextMenuOpen = false;
    attachDesktop();
    win.webContents.send('hali:command', 'dismiss-menu');
  });
  win.webContents.on('will-navigate', event => event.preventDefault());
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ipcMain.handle('hali:init', event => {
    if (!trusted(event)) throw new Error('Unknown sender');
    return { demo, platform: process.platform, entries: vault?.list() || [], recovery:vault?.status(),settings, startup: startup.status(), nativeDesktop: Boolean(nativeLayer),platformStatus };
  });
  ipcMain.handle('hali:open-vault',async event=>{
    if(!trusted(event)||!vault)throw new Error('Kasa bu modda kullanılamıyor.');
    const error=await shell.openPath(vault.root);if(error)throw new Error(error);
  });
  ipcMain.handle('hali:startup-status', event => {
    if (!trusted(event)) throw new Error('Unknown sender');
    return startup.status();
  });
  ipcMain.handle('hali:startup-set', (event, enabled) => {
    if (!trusted(event)) throw new Error('Unknown sender');
    return startup.set(enabled);
  });
  ipcMain.handle('hali:startup-settings',event=>{
    if(!trusted(event)||process.platform!=='darwin'||!nativeLayer?.openLoginSettings)throw new Error('Oturum açma ayarları kullanılamıyor.');
    nativeLayer.openLoginSettings();
  });
  ipcMain.handle('hali:stash', async (event, paths, position) => {
    if (!trusted(event) || demo) throw new Error('Dosya işlemi kullanılamıyor.');
    try { return await vault.stash(paths, position); } finally { publish(); }
  });
  ipcMain.handle('hali:restore', async (event, id) => {
    if (!trusted(event) || demo || typeof id !== 'string') throw new Error('Dosya işlemi kullanılamıyor.');
    try { return await vault.restore(id); } finally { publish(); }
  });
  ipcMain.on('hali:mouse', (event, active) => {
    if (trusted(event) && !demo) win.setIgnoreMouseEvents(!(active || contextMenuOpen), { forward: true });
  });
  ipcMain.on('hali:menu-open', (event, open) => {
    if (!trusted(event)) return;
    contextMenuOpen = Boolean(open);
    attachDesktop();
    if (contextMenuOpen) {
      if (!demo) win.setIgnoreMouseEvents(false);
      win.focus();
    }
  });
  ipcMain.on('hali:action', (event, name) => {
    if (!trusted(event)) return;
    if (name === 'quit') app.quit();
    if (name === 'hide') win.hide();
  });
  ipcMain.on('hali:save', (event, data) => {
    if (!trusted(event) || !data || typeof data !== 'object') return;
    settings=settingsStore.update(data);
  });
  if (!demo) win.setIgnoreMouseEvents(true, { forward: true });
  await win.loadURL(uiURL + (demo ? '?demo=1' : ''));
  win.showInactive(); attachDesktop();
  if(!demo&&process.platform==='win32'){
    windowsDesktop=new WindowsDesktop(path.join(app.getPath('userData'),'desktop-layer'),{resources:app.isPackaged?process.resourcesPath:undefined,onStatus:available=>reportPlatform(available?'ready':'fallback',available?'':'Masaüstü katmanı başlatılamadı. Windows Güvenliği yardımcı programı engellemiş olabilir; halı normal pencere olarak çalışıyor.')});
    windowsDesktop.start(win).catch(()=>reportPlatform('fallback','Masaüstü katmanı başlatılamadı; halı normal pencere olarak çalışıyor.'));
  }
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVQ4T2NkoBAwUqifYdQAAgAFAAAB9HFNpgAAAABJRU5ErkJggg==');
  // Draw the tray glyph locally as a small woven square.
  const pixels = Buffer.alloc(18 * 18 * 4);
  for (let y = 2; y < 16; y++) for (let x = 1; x < 17; x++) {
    if (x === 1 || x === 16 || y === 2 || y === 15 || (x + y) % 4 === 0) pixels[(y * 18 + x) * 4 + 3] = 255;
  }
  const glyph = nativeImage.createFromBitmap(pixels, { width: 18, height: 18, scaleFactor: 1 });
  if (process.platform === 'darwin') glyph.setTemplateImage(true);
  tray = new Tray(glyph.isEmpty() ? icon : glyph);
  tray.setToolTip('Halı · masaüstüne biraz huzur');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Halıyı göster / gizle', click: () => { if (win.isVisible()) win.hide(); else { win.showInactive(); attachDesktop(); } } },
    { label: 'Halının altındakiler', click: () => { win.showInactive(); win.webContents.send('hali:command', 'drawer'); } },
    { label: 'Halıyı düzelt', click: () => win.webContents.send('hali:command', 'reset') },
    { type: 'separator' },
    { label: 'Çıkış', click: () => app.quit() }
  ]));
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (win.isVisible()) win.hide(); else { win.showInactive(); attachDesktop(); }
  });
  screen.on('display-metrics-changed', () => { if (!demo) win.setBounds(screen.getPrimaryDisplay().bounds); });
  if(packageSmoke){
    const fs=require('node:fs/promises');
    const report=process.argv.find(arg=>arg.startsWith('--health-report='))?.slice('--health-report='.length);
    const timeout=setTimeout(()=>app.exit(1),30000);
    try{
      await win.webContents.executeJavaScript(`new Promise(resolve=>{const ready=()=>document.getElementById('weight').getAttribute('aria-valuetext')?resolve(true):requestAnimationFrame(ready);ready();})`);
      const result=await require('./health.cjs').verifyMove({resources:app.isPackaged&&process.platform==='win32'?process.resourcesPath:undefined});
      if(process.platform==='darwin')require('../native/build/desktop.node').attach(win.getNativeWindowHandle(),false);
      if(report){await fs.mkdir(path.dirname(report),{recursive:true});await fs.writeFile(report,JSON.stringify({...result,packaged:app.isPackaged,platform:process.platform,portableExecutable:process.env.PORTABLE_EXECUTABLE_FILE,startupExecutable:startup.options.path}));}
      clearTimeout(timeout);app.quit();
    }catch(error){console.error(error);clearTimeout(timeout);app.exit(1);}
  }
}
app.on('will-quit', () => {globalShortcut.unregisterAll();windowsDesktop?.stop();});
app.on('before-quit',event=>{
  if(quitting||!settingsStore)return;
  event.preventDefault();if(flushing)return;flushing=true;
  Promise.resolve(vault?.queue).then(()=>settingsStore.flush()).then(()=>{quitting=true;app.quit();}).catch(error=>{flushing=false;dialog.showErrorBox('Ayarlar kaydedilemedi',error.message+'\nKayıt tekrar denenebilir; uygulama açık bırakıldı.');});
});
app.on('window-all-closed', () => app.quit());
