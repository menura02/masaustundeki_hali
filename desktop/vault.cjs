const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { atomicWrite } = require('./atomic-file.cjs');
const { createMover } = require('./move.cjs');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function validItem(item){return item&&UUID.test(item.id)&&typeof item.name==='string'&&item.name.length>0&&!item.name.includes('\0')&&path.basename(item.name)===item.name&&!['.','..'].includes(item.name);}
function validate(data){
  if(!Array.isArray(data)||data.some(item=>!validItem(item))||new Set(data.map(item=>item.id)).size!==data.length)throw new Error('Kasa kaydı geçersiz.');
  return data;
}
class Vault {
  constructor(desktop,{moveExclusive=createMover()}={}) {
    this.desktop=path.resolve(desktop);this.root=path.join(this.desktop,'.hali-vault');
    this.ledger=path.join(this.root,'index.json');this.backup=path.join(this.root,'index.backup.json');
    this.metadata=path.join(this.root,'.metadata');this.entries=[];this.queue=Promise.resolve();this.moveExclusive=moveExclusive;
    this.recovery={needed:false,messages:[],unknownCount:0};
  }
  async init(){
    await fs.mkdir(this.root,{recursive:true,mode:0o700});
    if((await fs.lstat(this.root)).isSymbolicLink())throw new Error('Saklama klasörü bir bağlantı olamaz.');
    await fs.mkdir(this.metadata,{recursive:true,mode:0o700});
    if((await fs.lstat(this.metadata)).isSymbolicLink())throw new Error('Kasa metaveri klasörü bir bağlantı olamaz.');
    const payloads=(await fs.readdir(this.root)).filter(name=>UUID.test(name));
    let known=[],primaryError;
    try{known=validate(JSON.parse(await fs.readFile(this.ledger,'utf8')));}
    catch(error){
      primaryError=error;
      if(error.code&&error.code!=='ENOENT')throw error;
      if(error.code!=='ENOENT')await fs.copyFile(this.ledger,path.join(this.root,'index.damaged-'+randomUUID()+'.json'),fs.constants.COPYFILE_EXCL);
      try{known=validate(JSON.parse(await fs.readFile(this.backup,'utf8')));this.recovery.messages.push('Kasa kaydı yedekten kurtarıldı.');}
      catch(backupError){if(backupError.code&&backupError.code!=='ENOENT')throw backupError;}
    }
    const byId=new Map(known.map(item=>[item.id,item]));
    for(const id of payloads){
      let item=byId.get(id);
      if(!item){
        try{const meta=JSON.parse(await fs.readFile(path.join(this.metadata,id+'.json'),'utf8'));if(validItem(meta)&&meta.id===id)item=meta;}
        catch(error){if(error.code&&error.code!=='ENOENT')throw error;}
        this.recovery.messages.push(item?'Bir öğe özgün adıyla metaveriden kurtarıldı.':'Özgün adı bilinmeyen bir öğe bulundu; kurtarma adıyla geri alınabilir.');
      }
      this.entries.push({...item,id,name:item?.name||'Kurtarılan-'+id,state:'stored',recovered:!item||Boolean(item.recovered)});
    }
    if(primaryError&&payloads.length)this.recovery.messages.push('Ana kayıt eksik veya bozuktu. Kasadaki dosyalar korundu.');
    this.recovery.unknownCount=this.entries.filter(item=>item.recovered).length;
    this.recovery.needed=this.recovery.messages.length>0||this.recovery.unknownCount>0;
    this.recovery.messages=[...new Set(this.recovery.messages)];
    // Backfill per-item metadata for older vaults before updating the ledger.
    for(const item of this.entries)await atomicWrite(path.join(this.metadata,item.id+'.json'),JSON.stringify(item));
    await this.save();return this;
  }
  status(){return {...this.recovery,unknownCount:this.entries.filter(item=>item.recovered).length};}
  serial(fn){const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
  async save(){
    const data=JSON.stringify(this.entries,null,2);
    await atomicWrite(this.ledger,data);await atomicWrite(this.backup,data);
  }
  list(){return this.entries.filter(item=>item.state==='stored').map(({id,name,u,v,recovered})=>({id,name,u,v,recovered:Boolean(recovered)}));}
  stash(paths,position){return this.serial(async()=>{
    if(!Array.isArray(paths)||!paths.length||paths.length>200||paths.some(p=>typeof p!=='string'))throw new Error('En fazla 200 masaüstü öğesi bırakabilirsiniz.');
    const normalized=[...new Set(paths.map(p=>path.resolve(p)))];
    for(const source of normalized){
      if(path.dirname(source)!==this.desktop||path.basename(source).startsWith('.'))throw new Error('Yalnızca doğrudan masaüstündeki dosya ve klasörleri halıya bırakın.');
      await fs.lstat(source);
    }
    let completed=0;
    for(const source of normalized){
      const entry={id:randomUUID(),name:path.basename(source),state:'pending',u:Math.max(.1,Math.min(.9,Number(position?.u)||.5)),v:Math.max(.1,Math.min(.9,Number(position?.v)||.5))};
      await atomicWrite(path.join(this.metadata,entry.id+'.json'),JSON.stringify(entry));
      this.entries.push(entry);await this.save();
      try{await this.moveExclusive(source,path.join(this.root,entry.id));}
      catch(error){
        // A helper can finish the rename but lose its reply (for example a timeout).
        // Never discard the ledger entry while a payload exists in the vault.
        const moved=await fs.lstat(path.join(this.root,entry.id)).then(()=>true,statError=>{if(statError.code==='ENOENT')return false;throw statError;});
        if(moved){entry.state='stored';await this.save();throw new Error(`“${entry.name}” kasada korunuyor; işlem yanıtı doğrulanamadı. ${completed+1} öğe saklandı. ${error.message}`);}
        this.entries=this.entries.filter(item=>item.id!==entry.id);await this.save();
        throw new Error(`“${entry.name}” taşınamadı. ${completed} öğe saklandı; diğer dosyalar yerinde kaldı. ${error.message}`);
      }
      entry.state='stored';await this.save();completed++;
    }
    return this.list();
  });}
  restore(id){return this.serial(async()=>{
    const item=this.entries.find(item=>item.id===id&&item.state==='stored');if(!item)throw new Error('Öğe bulunamadı.');
    const ext=path.extname(item.name),base=path.basename(item.name,ext);
    let index=0;
    while(true){
      const name=index?`${base} (Halı ${index})${ext}`:item.name;
      try{await this.moveExclusive(path.join(this.root,item.id),path.join(this.desktop,name));break;}
      catch(error){if(error.code!=='EEXIST')throw error;if(++index>10000)throw new Error('Uygun bir geri getirme adı bulunamadı.');}
    }
    this.entries=this.entries.filter(entry=>entry.id!==id);await this.save();
    await fs.unlink(path.join(this.metadata,id+'.json')).catch(()=>{});
    return this.list();
  });}
}
module.exports={Vault};
