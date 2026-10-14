const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFile,spawn}=require('node:child_process');
const {promisify}=require('node:util');
const {createInterface}=require('node:readline');
class DesktopIcons {
  constructor(directory){this.directory=directory;this.state={available:false,icons:[]};}
  async start(){
    if(process.platform!=='win32')return;
    const source=await fs.readFile(path.join(__dirname,'DesktopIcons.cs'));
    const hash=createHash('sha256').update(source).digest('hex').slice(0,12);
    await fs.mkdir(this.directory,{recursive:true});
    const exe=path.join(this.directory,'icons-'+hash+'.exe');
    try {await fs.access(exe);} catch {
      const framework=path.join(process.env.WINDIR||'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319');
      const cs=path.join(this.directory,'DesktopIcons.cs');
      await fs.writeFile(cs,source);
      await promisify(execFile)(path.join(framework,'csc.exe'),['/nologo','/target:exe','/out:'+exe,'/reference:'+path.join(framework,'Accessibility.dll'),'/reference:System.Web.Extensions.dll',cs],{windowsHide:true,timeout:20000});
    }
    this.child=spawn(exe,[],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    const fail=()=>{this.state={available:false,icons:[]};this.stop();};
    this.child.on('error',fail);this.child.on('exit',fail);
    this.child.stdin.on('error',fail);
    createInterface({input:this.child.stdout}).on('line',line=>{
      clearTimeout(this.deadline);this.pending=false;
      try {this.state=JSON.parse(line);}catch{this.state={available:false,icons:[]};}
    });
    const scan=()=>{
      if(this.pending||!this.child)return;
      this.pending=true;this.child.stdin.write('scan\n');
      this.deadline=setTimeout(fail,5000);
    };
    scan();this.timer=setInterval(scan,1000);
  }
  stop(){clearInterval(this.timer);clearTimeout(this.deadline);const child=this.child;this.child=null;child?.kill();}
}
module.exports={DesktopIcons};
