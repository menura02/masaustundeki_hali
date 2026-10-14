const {test}=require('node:test');
const assert=require('node:assert/strict');
const {windowHandle,WindowsDesktop}=require('../desktop/windows-desktop.cjs');
test('HWND conversion preserves 64-bit pointer precision and rejects malformed handles',()=>{
  const handle=Buffer.alloc(8);handle.writeBigUInt64LE(0x20000000000001n);
  assert.equal(windowHandle(handle),'9007199254740993');
  const handle32=Buffer.alloc(4);handle32.writeUInt32LE(0xf1234567);
  assert.equal(windowHandle(handle32),String(0xf1234567));
  assert.throws(()=>windowHandle(Buffer.alloc(3)));assert.throws(()=>windowHandle('123'));
});
test('desktop layer pauses reordering for menus and can resume safely',()=>{
  const layer=new WindowsDesktop('unused'),commands=[];
  layer.setInteractive(true);assert.equal(layer.interactive,true);
  layer.child={stdin:{writable:true,write:value=>commands.push(value)},kill:()=>commands.push('kill')};
  layer.setInteractive(true);layer.setInteractive(false);layer.stop();
  assert.deepEqual(commands,['interactive\n','desktop\n','kill']);assert.equal(layer.available,false);
});
