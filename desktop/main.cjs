const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, globalShortcut, dialog, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { Vault } = require('./vault.cjs');
const { DesktopIcons } = require('./icons.cjs');
const { Startup } = require('./startup.cjs');
const { WindowsDesktop } = require('./windows-desktop.cjs');
const demo = process.argv.includes('--demo');
let win, tray, vault, settings = {}, nativeLayer, saveTimer;
let desktopIcons,windowsDesktop;
let iconsWatching=false;
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
  if (nativeLayer && !demo) nativeLayer.attach(win.getNativeWindowHandle(),contextMenuOpen);
  windowsDesktop?.setInteractive(contextMenuOpen);
}
async function boot() {
  const startup = new Startup(app, { demo });
  if(!demo)desktopIcons=new DesktopIcons(path.join(app.getPath('userData'),'icon-reader'),{resources:app.isPackaged?process.resourcesPath:undefined});
  if (!demo) vault = await new Vault(app.getPath('desktop')).init();
  if (!demo && process.platform === 'win32') execFile('attrib.exe', ['+H', vault.root], { windowsHide: true }, error => { if (error) console.warn(error.message); });
  const settingsPath = path.join(app.getPath('userData'), 'rug.json');
  try { settings = JSON.parse(await fs.readFile(settingsPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.warn(e.message); }
  if (process.platform === 'darwin' && !demo) {
    try { nativeLayer = require('../native/build/desktop.node'); }
    catch { dialog.showErrorBox('macOS masaüstü katmanı eksik', 'Önce npm run native komutunu çalıştırın. Halı normal pencere olarak açılacak.'); }
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
    return { demo, platform: process.platform, entries: vault?.list() || [], settings, startup: startup.status(), nativeDesktop: Boolean(nativeLayer) };
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
  ipcMain.handle('hali:icons-retry',async event=>{
    if(!trusted(event)||demo)throw new Error('Simge okuyucu kullanılamıyor.');
    desktopIcons.stop();await desktopIcons.start();const state=desktopIcons.snapshot();if(!iconsWatching)desktopIcons.stop();return state;
  });
  ipcMain.on('hali:icons-watch',(event,active)=>{
    if(!trusted(event)||demo)return;
    const watch=Boolean(active)&&win.isVisible();
    if(watch===iconsWatching)return;
    iconsWatching=watch;
    if(!watch)desktopIcons.stop();
    else if(!desktopIcons.snapshot().permissionRequired)desktopIcons.start().catch(console.error);
  });
  win.on('hide',()=>{iconsWatching=false;desktopIcons?.stop();});
  ipcMain.handle('hali:stash', async (event, paths, position) => {
    if (!trusted(event) || demo) throw new Error('Dosya işlemi kullanılamıyor.');
    try { return await vault.stash(paths, position); } finally { publish(); }
  });
  ipcMain.handle('hali:icons',event=>{
    if(!trusted(event))throw new Error('Unknown sender');
    const state=desktopIcons?.snapshot()||{available:false,icons:[]};
    const bounds=win.getContentBounds();
    return {available:state.available,permissionRequired:Boolean(state.permissionRequired),error:state.error,icons:state.icons.map(icon=>{
      const center={x:Math.round(icon.x+icon.width/2),y:Math.round(icon.y+Math.min(icon.width,icon.height)/2)};
      const p=state.coordinateSpace==='dip'?center:screen.screenToDipPoint(center);
      return {name:icon.name,x:p.x-bounds.x,y:p.y-bounds.y};
    })};
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
    settings = { theme: ['wine', 'indigo', 'moss'].includes(data.theme) ? data.theme : 'wine',
      weight: Number.isFinite(data.weight) ? Math.max(0,Math.min(100,data.weight)) : 50,
      x: Number.isFinite(data.x) ? Math.min(.999, Math.max(.001, data.x)) : .5,
      y: Number.isFinite(data.y) ? Math.min(.999, Math.max(.001, data.y)) : .5,
      w: Number.isFinite(data.w) ? Math.min(.999,Math.max(.001,data.w)) : undefined,
      h: Number.isFinite(data.h) ? Math.min(.999,Math.max(.001,data.h)) : undefined };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => fs.writeFile(settingsPath, JSON.stringify(settings)).catch(console.error), 300);
  });
  await win.loadURL(uiURL + (demo ? '?demo=1' : ''));
  win.showInactive(); attachDesktop();
  if(!demo&&process.platform==='win32'){
    windowsDesktop=new WindowsDesktop(path.join(app.getPath('userData'),'desktop-layer'),{resources:app.isPackaged?process.resourcesPath:undefined});
    windowsDesktop.start(win).catch(error=>console.error('Masaüstü katmanı:',error.message));
  }
  if (!demo) win.setIgnoreMouseEvents(true, { forward: true });
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
}
app.on('will-quit', () => {globalShortcut.unregisterAll();desktopIcons?.stop();windowsDesktop?.stop();});
app.on('window-all-closed', () => app.quit());
