const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Startup, STARTUP_NAME } = require('../desktop/startup.cjs');
function fixture(isPackaged = false) {
  const writes = [], reads = [];
  const app = { isPackaged, getAppPath: () => 'C:\\My Projects\\Halı',
    getLoginItemSettings(options) { reads.push(options); return this.state; },
    state: { openAtLogin: false, launchItems: [] },
    setLoginItemSettings(options) {
      writes.push(options);
      this.state = { openAtLogin: options.openAtLogin, launchItems: [{ name: options.name, enabled: options.enabled }] };
    } };
  const startup = new Startup(app, { platform: 'win32', executable: 'C:\\Program Files\\Halı\\Halı.exe' });
  return { app, startup, writes, reads };
}
test('startup only reads on initialization; toggle registers and removes the same quoted development command', () => {
  const { startup, writes, reads } = fixture();
  assert.deepEqual(startup.status(), { supported: true, enabled: false });assert.equal(writes.length, 0);
  assert.equal(startup.set(true).enabled, true);
  assert.equal(startup.set(false).enabled, false);
  assert.deepEqual(writes[0], { path: 'C:\\Program Files\\Halı\\Halı.exe', args: ['"C:\\My Projects\\Halı"'], name: STARTUP_NAME, openAtLogin: true, enabled: true });
  assert.deepEqual(writes[1], { ...writes[0], openAtLogin: false, enabled: false });
  assert.deepEqual(reads[0], { path: writes[0].path, args: writes[0].args });
});
test('packaged app launches its own executable and observes Windows startup approval', () => {
  const { app, startup, writes } = fixture(true);
  startup.set(true);assert.deepEqual(writes[0].args, []);
  app.state = { openAtLogin: true, launchItems: [{ name: STARTUP_NAME, enabled: false }, { name: 'AnotherApp', enabled: true }] };
  assert.equal(startup.status().enabled, false);
});
test('demo, unsupported platforms, invalid input and rejected writes cannot silently enable startup', () => {
  const { app, startup, writes } = fixture();
  for (const options of [{ platform: 'win32', demo: true }, { platform: 'darwin' }]) {
    const disabled = new Startup(app, options);
    assert.equal(disabled.status().supported, false);assert.throws(() => disabled.set(true));
  }
  assert.throws(() => startup.set('true'));assert.equal(writes.length, 0);
  app.setLoginItemSettings = () => {};
  assert.throws(() => startup.set(true), /uygulanamadı/);
});
test('macOS packaged app uses main login service and reports pending system approval',()=>{
  const writes=[];let state={openAtLogin:false,status:'not-registered'};
  const app={isPackaged:true,getLoginItemSettings:options=>{assert.deepEqual(options,{});return state;},
    setLoginItemSettings:options=>{writes.push(options);state={openAtLogin:false,status:options.openAtLogin?'requires-approval':'not-registered'};}};
  const startup=new Startup(app,{platform:'darwin'});
  assert.equal(startup.status().enabled,false);assert.equal(writes.length,0);
  assert.equal(startup.set(true).requiresApproval,true);assert.deepEqual(writes[0],{openAtLogin:true});
  state={openAtLogin:true,status:'enabled'};assert.equal(startup.status().enabled,true);
  assert.equal(startup.set(false).enabled,false);assert.deepEqual(writes[1],{openAtLogin:false});
});
test('macOS development launch cannot accidentally register Electron instead of the app',()=>{
  let writes=0;
  const startup=new Startup({isPackaged:false,setLoginItemSettings:()=>writes++},{platform:'darwin'});
  assert.equal(startup.status().reason,'packaged-required');assert.throws(()=>startup.set(true));assert.equal(writes,0);
});

test('portable startup registers the permanent launcher instead of the extracted temp executable',()=>{
  const {app,writes}=fixture(true);
  const portable='C:\\My Apps\\Hali-Portable.exe';
  new Startup(app,{platform:'win32',executable:'C:\\Temp\\extracted\\Halı.exe',portableExecutable:portable}).set(true);
  assert.equal(writes[0].path,portable);assert.deepEqual(writes[0].args,[]);
});
