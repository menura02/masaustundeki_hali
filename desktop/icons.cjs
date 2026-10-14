const {spawn}=require('node:child_process');
const path=require('node:path');
const {createInterface}=require('node:readline');
const {windowsHelper}=require('./windows-helper.cjs');
const {MacDesktopIcons}=require('./mac-icons.cjs');
class DesktopIcons {
  constructor(directory,{resources,platform=process.platform}={}){this.directory=directory;this.resources=resources;this.platform=platform;this.generation=0;this.state={available:false,icons:[]};}
  async start(){
    if(this.platform==='darwin'){
      this.mac ||= new MacDesktopIcons({scriptPath:this.resources?path.join(this.resources,'app.asar.unpacked','desktop','FinderIcons.js'):undefined});
      await this.mac.start();return;
    }
    if(this.platform!=='win32')return;
    this.stop();
    const generation=this.generation;
    const exe=await windowsHelper('DesktopIcons',this.directory,this.resources);
    if(generation!==this.generation)return;
    this.child=spawn(exe,[],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    const child=this.child;
    const fail=()=>{if(this.child!==child)return;this.state={available:false,icons:[]};this.stop();};
    this.child.on('error',fail);this.child.on('exit',fail);
    this.child.stdin.on('error',fail);
    createInterface({input:this.child.stdout}).on('line',line=>{
      if(this.child!==child)return;
      clearTimeout(this.deadline);this.pending=false;
      try {this.state=JSON.parse(line);}catch{this.state={available:false,icons:[]};}
    });
    const scan=()=>{
      if(this.pending||!this.child)return;
      this.pending=true;this.child.stdin.write('scan\n');
      this.deadline=setTimeout(fail,5000);
    };
    scan();this.timer=setInterval(scan,3000);
  }
  snapshot(){return this.mac?.state||this.state;}
  stop(){this.generation++;this.pending=false;this.mac?.stop();clearInterval(this.timer);clearTimeout(this.deadline);const child=this.child;this.child=null;child?.kill();}
}
module.exports={DesktopIcons};
