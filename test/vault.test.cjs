const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Vault } = require('../desktop/vault.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hali-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const desktop = path.join(root, 'Desktop'); await fs.mkdir(desktop);
  return { root, desktop, vault: await new Vault(desktop).init() };
}
test('files survive stashing, restarting and restoring byte for byte', async t => {
  const { desktop, vault } = await fixture(t), data = Buffer.from([0,255,42,13,10]);
  await fs.writeFile(path.join(desktop,'notlar.txt'),data);
  await vault.stash([path.join(desktop,'notlar.txt')],{u:.3,v:.6});
  assert.equal(vault.list()[0].u,.3);
  await assert.rejects(fs.stat(path.join(desktop,'notlar.txt')),{code:'ENOENT'});
  const restarted = await new Vault(desktop).init(); await restarted.restore(restarted.list()[0].id);
  assert.deepEqual(await fs.readFile(path.join(desktop,'notlar.txt')),data);assert.equal(restarted.list().length,0);
});
test('restore preserves an existing same-name desktop item', async t => {
  const { desktop, vault }=await fixture(t),p=path.join(desktop,'fikir.txt');
  await fs.writeFile(p,'original');await vault.stash([p]);await fs.writeFile(p,'new');await vault.restore(vault.list()[0].id);
  assert.equal(await fs.readFile(p,'utf8'),'new');assert.equal(await fs.readFile(path.join(desktop,'fikir (Halı 1).txt'),'utf8'),'original');
});
test('folders, unicode names, duplicates and concurrent requests are safe', async t => {
  const { desktop, vault }=await fixture(t),p=path.join(desktop,'Özel çalışma');
  await fs.mkdir(p);await fs.writeFile(path.join(p,'içerik.txt'),'keep me');
  await vault.stash([p,p]);assert.equal(vault.list().length,1);
  await Promise.all([vault.restore(vault.list()[0].id),vault.stash([path.join(desktop,'Özel çalışma')])]);
  await vault.restore(vault.list()[0].id);assert.equal(await fs.readFile(path.join(p,'içerik.txt'),'utf8'),'keep me');
});
test('out-of-desktop paths and the vault itself are rejected before moving anything', async t => {
  const {root,desktop,vault}=await fixture(t),outside=path.join(root,'secret.txt'),inside=path.join(desktop,'safe.txt');
  await fs.writeFile(outside,'private');await fs.writeFile(inside,'safe');
  await assert.rejects(vault.stash([inside,outside]));assert.equal(await fs.readFile(inside,'utf8'),'safe');
  await assert.rejects(vault.stash([vault.root]));assert.equal(vault.list().length,0);
});
test('write-ahead recovery preserves moved items and clears unperformed moves', async t => {
  const {desktop,vault}=await fixture(t),p=path.join(desktop,'test.txt');await fs.writeFile(p,'survives');
  await vault.stash([p]);const stored=vault.entries[0];stored.state='pending';
  vault.entries.push({id:'00000000-0000-4000-8000-000000000001',name:'never-moved.txt',state:'pending'});await vault.save();
  const restarted=await new Vault(desktop).init();assert.equal(restarted.list().length,1);await restarted.restore(stored.id);assert.equal(await fs.readFile(p,'utf8'),'survives');
});

test('a file created at the destination during restore is never overwritten',async t=>{
  const {desktop,vault}=await fixture(t),file=path.join(desktop,'race.txt');
  await fs.writeFile(file,'stored');await vault.stash([file]);
  const move=vault.moveExclusive;let injected=false;
  vault.moveExclusive=async(source,destination)=>{if(!injected){injected=true;await fs.writeFile(destination,'external');}return move(source,destination);};
  await vault.restore(vault.list()[0].id);
  assert.equal(await fs.readFile(file,'utf8'),'external');assert.equal(await fs.readFile(path.join(desktop,'race (Halı 1).txt'),'utf8'),'stored');
});

test('restoring a folder preserves an existing folder and its contents',async t=>{
  const {desktop,vault}=await fixture(t),folder=path.join(desktop,'folder');
  await fs.mkdir(folder);await fs.writeFile(path.join(folder,'keep'),'stored');await vault.stash([folder]);
  await fs.mkdir(folder);await fs.writeFile(path.join(folder,'keep'),'external');await vault.restore(vault.list()[0].id);
  assert.equal(await fs.readFile(path.join(folder,'keep'),'utf8'),'external');assert.equal(await fs.readFile(path.join(desktop,'folder (Halı 1)','keep'),'utf8'),'stored');
});

test('missing or corrupt ledger recovers original names from backup or per-item metadata',async t=>{
  const {desktop,vault}=await fixture(t),file=path.join(desktop,'Özgün.txt');
  await fs.writeFile(file,'preserved');await vault.stash([file]);
  await fs.writeFile(vault.ledger,'{broken');let reopened=await new Vault(desktop).init();
  assert.equal(reopened.list()[0].name,'Özgün.txt');assert.equal(reopened.status().needed,true);
  assert.ok((await fs.readdir(vault.root)).some(name=>name.startsWith('index.damaged-')));
  await fs.unlink(vault.ledger);await fs.unlink(vault.backup);reopened=await new Vault(desktop).init();
  assert.equal(reopened.list()[0].name,'Özgün.txt');await reopened.restore(reopened.list()[0].id);
  assert.equal(await fs.readFile(file,'utf8'),'preserved');
});

test('legacy payload without any name metadata is listed and recoverable',async t=>{
  const {desktop,vault}=await fixture(t),id='00000000-0000-4000-8000-000000000009';
  await fs.writeFile(path.join(vault.root,id),'orphan-bytes');await fs.unlink(vault.ledger);await fs.unlink(vault.backup);
  const reopened=await new Vault(desktop).init(),item=reopened.list()[0];
  assert.equal(item.recovered,true);assert.equal(reopened.status().unknownCount,1);
  await reopened.restore(id);assert.equal(await fs.readFile(path.join(desktop,item.name),'utf8'),'orphan-bytes');
});

test('invalid JSON shape does not prevent backup recovery',async t=>{
  const {desktop,vault}=await fixture(t),file=path.join(desktop,'safe.txt');
  await fs.writeFile(file,'safe');await vault.stash([file]);await fs.writeFile(vault.ledger,'null');
  const reopened=await new Vault(desktop).init();assert.equal(reopened.list().length,1);
});

test('unavailable safe mover leaves source untouched and does not advertise a stored item',async t=>{
  const {desktop,vault}=await fixture(t),file=path.join(desktop,'safe.txt');
  await fs.writeFile(file,'safe');vault.moveExclusive=async()=>{throw new Error('blocked');};
  await assert.rejects(vault.stash([file]),/0 öğe saklandı/);assert.equal(vault.list().length,0);assert.equal(await fs.readFile(file,'utf8'),'safe');
});

test('lost helper reply after a completed move cannot hide a stored payload',async t=>{
  const {desktop,vault}=await fixture(t),file=path.join(desktop,'reply.txt');
  await fs.writeFile(file,'safe');const move=vault.moveExclusive;
  vault.moveExclusive=async(source,destination)=>{await move(source,destination);throw new Error('reply lost');};
  await assert.rejects(vault.stash([file]),/kasada korunuyor/);assert.equal(vault.list().length,1);
  const reopened=await new Vault(desktop).init();await reopened.restore(reopened.list()[0].id);assert.equal(await fs.readFile(file,'utf8'),'safe');
});
