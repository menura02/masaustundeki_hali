const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {SettingsStore,sanitize}=require('../desktop/settings.cjs');
test('settings reject invalid shapes and clamp persisted values',()=>{
  for(const input of [null,[],42])assert.equal(sanitize(input).theme,'wine');
  assert.equal(sanitize({weight:Infinity}).weight,50);assert.equal(sanitize({weight:200}).weight,100);
});
test('flush saves latest settings immediately and serializes overlapping writes',async()=>{
  const writes=[];let finish;
  const store=new SettingsStore('unused',{delay:60000,write:async(_file,data)=>{writes.push(JSON.parse(data));if(writes.length===1)await new Promise(resolve=>finish=resolve);}});
  store.update({weight:10});const first=store.flush();await new Promise(resolve=>setImmediate(resolve));
  store.update({weight:90});const last=store.flush();assert.equal(writes.length,1);finish();await Promise.all([first,last]);
  assert.deepEqual(writes.map(value=>value.weight),[10,90]);assert.equal(store.dirty,false);
});
test('failed settings write remains retryable',async()=>{
  let fail=true;const store=new SettingsStore('unused',{delay:60000,write:async()=>{if(fail)throw new Error('disk full');}});
  store.update({weight:80});await assert.rejects(store.flush(),/disk full/);assert.equal(store.dirty,true);fail=false;await store.flush();assert.equal(store.dirty,false);
});
test('atomic settings survive restart and null or malformed files fall back safely',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hali-settings-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file=path.join(root,'rug.json'),store=new SettingsStore(file,{onError:()=>{}});
  store.update({weight:83});await store.flush();assert.equal((await new SettingsStore(file).load()).weight,83);
  for(const invalid of ['null','{broken']){await fs.writeFile(file,invalid);assert.equal((await new SettingsStore(file,{onError:()=>{}}).load()).weight,50);}
});
