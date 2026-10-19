const fs=require('node:fs/promises');const path=require('node:path');
const {execFile}=require('node:child_process');const {promisify}=require('node:util');
const assert=require('node:assert/strict');
(async()=>{
  const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');let executable;
  const portable=process.argv.includes('--portable');
  if(process.platform==='win32')executable=portable?path.join(dist,'Hali-'+require('../package.json').version+'-Portable.exe'):path.join(dist,'win-unpacked','Halı.exe');
  else if(process.platform==='darwin'){
    const folders=(await fs.readdir(dist)).filter(name=>name.startsWith('mac')).sort((a,b)=>Number(b.includes('universal'))-Number(a.includes('universal')));
    for(const folder of folders){const candidate=path.join(dist,folder,'Halı.app','Contents','MacOS','Halı');try{await fs.access(candidate);executable=candidate;break;}catch{}}
  }
  if(!executable)throw new Error('Paketli uygulama bulunamadı. Önce paketleme çalıştırılmalı.');
  const report=path.join(root,'artifacts',portable?'portable-smoke.json':'package-smoke.json');await fs.unlink(report).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await promisify(execFile)(executable,['--package-smoke','--health-report='+report],{timeout:portable?120000:45000,windowsHide:true});
  const result=JSON.parse(await fs.readFile(report,'utf8'));assert.equal(result.passed,true);assert.equal(result.packaged,true);
  if(portable){assert.equal(path.resolve(result.portableExecutable).toLowerCase(),path.resolve(executable).toLowerCase());assert.equal(result.startupExecutable,result.portableExecutable);}
  console.log('PASS: packaged renderer, native resources and exclusive file/folder moves.');
})().catch(error=>{console.error(error);process.exitCode=1;});
