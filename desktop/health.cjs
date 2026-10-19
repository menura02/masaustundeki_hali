const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const {createMover}=require('./move.cjs');
async function verifyMove({resources,native}={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'hali-native-health-'));
  const move=createMover({resources,native,directory:path.join(root,'helpers')});
  for(const directory of [false,true]){
    const source=path.join(root,directory?'folder-source':'file-source'),destination=source+'-destination';
    if(directory){await fs.mkdir(source);await fs.mkdir(destination);await fs.writeFile(path.join(source,'data'),'source');await fs.writeFile(path.join(destination,'data'),'target');}
    else{await fs.writeFile(source,'source');await fs.writeFile(destination,'target');}
    await assert.rejects(move(source,destination),{code:'EEXIST'});
    assert.equal(await fs.readFile(directory?path.join(destination,'data'):destination,'utf8'),'target');
    const free=source+'-restored';await move(source,free);
    assert.equal(await fs.readFile(directory?path.join(free,'data'):free,'utf8'),'source');
  }
  return {passed:true,scope:'exclusive-file-and-directory-moves'};
}
module.exports={verifyMove};
