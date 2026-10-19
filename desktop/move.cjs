const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {windowsHelper}=require('./windows-helper.cjs');
function createMover({platform=process.platform,directory=path.join(os.tmpdir(),'hali-move-helper'),resources,native}={}){
  let executable;
  return async(source,destination)=>{
    if(platform==='darwin'){
      const layer=native||require('../native/build/desktop.node');
      layer.moveExclusive(source,destination);return;
    }
    if(platform==='win32'){
      executable ||= windowsHelper('DesktopLayer',directory,resources).catch(error=>{executable=null;throw error;});
      const {stdout}=await promisify(execFile)(await executable,['--move-exclusive',source,destination],{windowsHide:true,timeout:15000});
      const result=JSON.parse(stdout);
      if(result.ok)return;
      throw Object.assign(new Error(result.error||'Güvenli taşıma başarısız.'),{code:result.code});
    }
    throw new Error('Üzerine yazmadan taşıma bu platformda desteklenmiyor.');
  };
}
module.exports={createMover};
