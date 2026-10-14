const path=require('node:path');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const {app,BrowserWindow}=require('electron');
const report=path.resolve(__dirname,'../artifacts/native-smoke.json');
function record(value){fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(value,null,2));}
app.whenReady().then(()=>{
  if(process.platform==='darwin'){
    const native=require('../native/build/desktop.node');
    const win=new BrowserWindow({width:120,height:120,show:false,frame:false,transparent:true});
    assert.equal(typeof native.openLoginSettings,'function');
    assert.throws(()=>native.attach(Buffer.alloc(1)),/handle/);
    native.attach(win.getNativeWindowHandle(),false);
    native.attach(win.getNativeWindowHandle(),true);
    native.attach(win.getNativeWindowHandle(),false);
    assert.equal(win.isVisible(),false);
    win.destroy();
  }else if(process.platform==='win32'){
    const result=JSON.parse(execFileSync(path.resolve(__dirname,'../native/build/DesktopLayer.exe'),['--probe'],{encoding:'utf8',windowsHide:true}));
    assert.equal(result.probe,true);assert.ok([4,8].includes(result.pointerSize));
  }
  console.log('PASS: native module / helper loads. Interactive desktop behavior still requires device testing.');
  record({passed:true,platform:process.platform,scope:'native-load-only'});
  app.exit(0);
}).catch(error=>{record({passed:false,error:error.message});console.error(error);app.exit(1);});
