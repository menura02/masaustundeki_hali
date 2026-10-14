const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {MacDesktopIcons,parseFinderResult}=require('../desktop/mac-icons.cjs');
const finderScript=fs.readFileSync(path.join(__dirname,'../desktop/FinderIcons.js'),'utf8');
function finder(items){
  const context={Application:name=>{assert.equal(name,'Finder');return {desktop:{items:()=>items}};}};
  vm.createContext(context);vm.runInContext(finderScript,context);
  return JSON.parse(context.run());
}
test('Finder reader preserves Unicode names and logical icon centers without reading contents',()=>{
  const state=finder([{name:()=> 'Özel "dosya".txt',desktopPosition:()=>[123,456]},{name:()=> 'kayıp',desktopPosition:()=>{throw new Error('disappeared');}}]);
  assert.equal(state.available,true);assert.deepEqual(state.icons,[{name:'Özel "dosya".txt',x:123,y:456,width:0,height:0}]);
  assert.equal(state.coordinateSpace,'dip');assert.equal(parseFinderResult(JSON.stringify(state)).icons[0].x,123);
});
test('denied Finder permission is unavailable rather than a fake zero count',()=>{
  const state=finder([{desktopPosition:()=>{const error=new Error('Not authorized (-1743)');error.errorNumber=-1743;throw error;}}]);
  assert.equal(state.available,false);assert.equal(state.permissionRequired,true);assert.deepEqual(state.icons,[]);
});
test('invalid positions, malformed responses and total read failure are handled',()=>{
  assert.throws(()=>parseFinderResult('{broken'));
  assert.throws(()=>parseFinderResult('{}'));
  assert.equal(parseFinderResult(JSON.stringify({available:true,icons:[{name:'bad',x:null,y:2},{name:'okay',x:4,y:5}]})).icons.length,1);
  const state=finder([{desktopPosition:()=>{throw new Error('Finder failed');}}]);
  assert.equal(state.available,false);
});
test('macOS scanner stops prompting after denial and can be retried deliberately',async t=>{
  let calls=0;
  const reader=new MacDesktopIcons({interval:10,run:async(command,args)=>{
    assert.equal(command,'/usr/bin/osascript');assert.deepEqual(args.slice(0,2),['-l','JavaScript']);calls++;
    return {stdout:JSON.stringify(calls===1?{available:false,permissionRequired:true,icons:[]}:{available:true,icons:[]})};
  }});
  t.after(()=>reader.stop());await reader.start();
  await new Promise(resolve=>setTimeout(resolve,30));assert.equal(calls,1);
  await reader.start();assert.equal(reader.state.available,true);assert.equal(calls,2);
});
test('stopped scanner ignores a late response',async()=>{
  let finish;const reader=new MacDesktopIcons({run:()=>new Promise(resolve=>finish=resolve)});
  const pending=reader.start();reader.stop();finish({stdout:'{"available":true,"icons":[]}'});await pending;
  assert.equal(reader.state.available,false);
});
test('packaged Finder script uses an external unpacked path as a single argument',async()=>{
  const scriptPath='/Applications/Halı.app/Contents/Resources/app.asar.unpacked/desktop/FinderIcons.js';
  const reader=new MacDesktopIcons({scriptPath,run:async(command,args)=>{
    assert.equal(args[2],scriptPath);assert.equal(args.length,3);
    return {stdout:'{"available":false,"permissionRequired":true,"icons":[]}'};
  }});
  await reader.start();reader.stop();
});
