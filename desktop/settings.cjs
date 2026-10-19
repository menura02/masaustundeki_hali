const fs=require('node:fs/promises');
const {atomicWrite}=require('./atomic-file.cjs');
function sanitize(data){
  if(!data||typeof data!=='object'||Array.isArray(data))data={};
  const bound=(key,min,max,fallback)=>Number.isFinite(data[key])?Math.max(min,Math.min(max,data[key])):fallback;
  return {theme:['wine','indigo','moss'].includes(data.theme)?data.theme:'wine',weight:bound('weight',0,100,50),x:bound('x',.001,.999,.5),y:bound('y',.001,.999,.5),w:bound('w',.001,.999,undefined),h:bound('h',.001,.999,undefined)};
}
class SettingsStore{
  constructor(file,{write=atomicWrite,delay=300,onError=console.error}={}){Object.assign(this,{file,write,delay,onError});this.value=sanitize({});this.queue=Promise.resolve();this.dirty=false;}
  async load(){
    try{this.value=sanitize(JSON.parse(await fs.readFile(this.file,'utf8')));}
    catch(error){if(error.code!=='ENOENT')this.onError(error);}
    return this.value;
  }
  update(data){this.value=sanitize(data);this.dirty=true;clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(this.onError),this.delay);return this.value;}
  flush(){
    clearTimeout(this.timer);
    const task=async()=>{
      if(!this.dirty)return;
      const value=this.value;await this.write(this.file,JSON.stringify(value));
      if(value===this.value)this.dirty=false;
    };
    const result=this.queue.then(task);this.queue=result.catch(()=>{});return result;
  }
}
module.exports={SettingsStore,sanitize};
