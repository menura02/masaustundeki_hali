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
