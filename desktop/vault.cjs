const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Keep the vault on the Desktop volume: a rename is atomic and never copies/deletes data.
class Vault {
  constructor(desktop) {
    this.desktop = path.resolve(desktop);
    this.root = path.join(this.desktop, '.hali-vault');
    this.ledger = path.join(this.root, 'index.json');
    this.entries = [];
    this.queue = Promise.resolve();
  }
  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(this.root)).isSymbolicLink()) throw new Error('Saklama klasörü bir bağlantı olamaz.');
    try { this.entries = JSON.parse(await fs.readFile(this.ledger, 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    for (const item of this.entries) {
      if (!/^[a-f0-9-]{36}$/.test(item.id) || path.basename(item.name) !== item.name || !item.name || item.name === '.' || item.name === '..') {
        throw new Error('Halı kayıt dosyası geçersiz. Dosyalar .hali-vault içinde korunuyor.');
      }
    }
    // Recover interrupted moves from the write-ahead ledger.
    this.entries = (await Promise.all(this.entries.map(async item => {
      try { await fs.lstat(path.join(this.root, item.id)); return { ...item, state: 'stored' }; }
      catch (e) { if (e.code !== 'ENOENT') throw e; return null; }
    }))).filter(Boolean);
    await this.save();
    return this;
  }
  serial(fn) {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async save() {
    const temp = this.ledger + '.tmp';
    const handle = await fs.open(temp, 'w', 0o600);
    try { await handle.writeFile(JSON.stringify(this.entries, null, 2)); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(temp, this.ledger);
  }
  list() { return this.entries.filter(e => e.state === 'stored').map(({ id, name, u, v }) => ({ id, name, u, v })); }
  stash(paths, position) {
    return this.serial(async () => {
      if (!Array.isArray(paths) || !paths.length || paths.length > 200) throw new Error('En fazla 200 masaüstü öğesi bırakabilirsiniz.');
      const normalized = [...new Set(paths.map(p => path.resolve(p)))];
      for (const source of normalized) {
        if (path.dirname(source) !== this.desktop || path.basename(source).startsWith('.')) {
          throw new Error('Yalnızca doğrudan masaüstündeki dosya ve klasörleri halıya bırakın.');
        }
        await fs.lstat(source);
      }
      for (const source of normalized) {
        const entry = { id: randomUUID(), name: path.basename(source), state: 'pending',
          u: Math.max(.1, Math.min(.9, Number(position?.u) || .5)),
          v: Math.max(.1, Math.min(.9, Number(position?.v) || .5)) };
        this.entries.push(entry);
        await this.save();
        try { await fs.rename(source, path.join(this.root, entry.id)); }
        catch (e) {
          this.entries = this.entries.filter(i => i.id !== entry.id);
          await this.save();
          throw new Error(`“${entry.name}” taşınamadı: ${e.message}`);
        }
        entry.state = 'stored';
        await this.save();
      }
      return this.list();
    });
  }
  restore(id) {
    return this.serial(async () => {
      const item = this.entries.find(e => e.id === id);
      if (!item) throw new Error('Öğe bulunamadı.');
      const ext = path.extname(item.name), base = path.basename(item.name, ext);
      let destination = path.join(this.desktop, item.name), index = 1;
      while (await fs.lstat(destination).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; })) {
        destination = path.join(this.desktop, `${base} (Halı ${index++})${ext}`);
      }
      await fs.rename(path.join(this.root, item.id), destination);
      this.entries = this.entries.filter(e => e.id !== id);
      await this.save();
      return this.list();
    });
  }
}
module.exports = { Vault };
