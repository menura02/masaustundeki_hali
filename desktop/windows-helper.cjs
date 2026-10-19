const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
async function windowsHelper(name, directory, resources) {
  if (!['DesktopLayer'].includes(name)) throw new Error('Unknown native helper');
  if (resources) {
    const packaged = path.join(resources,'helpers',name+'.exe');
    await fs.access(packaged);
    return packaged;
  }
  const source = await fs.readFile(path.join(__dirname,name+'.cs'));
  const hash = createHash('sha256').update(source).digest('hex').slice(0,12);
  await fs.mkdir(directory,{recursive:true});
  const executable = path.join(directory,name+'-'+hash+'.exe');
  try { await fs.access(executable); return executable; } catch {}
  const framework = path.join(process.env.WINDIR || 'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319');
  const cs = path.join(directory,name+'.cs');
  await fs.writeFile(cs,source);
  const references = ['/reference:System.Web.Extensions.dll'];
  await promisify(execFile)(path.join(framework,'csc.exe'),['/nologo','/target:exe','/out:'+executable,...references,cs],{windowsHide:true,timeout:20000});
  return executable;
}
module.exports = { windowsHelper };
