const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
async function atomicWrite(file,content){
  const temp=file+'.'+randomUUID()+'.tmp';
  const handle=await fs.open(temp,'wx',0o600);
  try{
    await handle.writeFile(content);await handle.sync();await handle.close();
    await fs.rename(temp,file);
    if(process.platform!=='win32'){
      const directory=await fs.open(path.dirname(file),'r');
      try{await directory.sync();}finally{await directory.close();}
    }
  }catch(error){await handle.close().catch(()=>{});await fs.unlink(temp).catch(()=>{});throw error;}
}
module.exports={atomicWrite};
