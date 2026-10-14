const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { windowsHelper } = require('./windows-helper.cjs');
function windowHandle(buffer) {
  if (!Buffer.isBuffer(buffer) || ![4,8].includes(buffer.length)) throw new Error('Geçersiz pencere kimliği.');
  return buffer.length === 8 ? buffer.readBigUInt64LE().toString() : String(buffer.readUInt32LE());
}
class WindowsDesktop {
  constructor(directory,{resources}={}) { this.directory=directory;this.resources=resources;this.available=false;this.interactive=false; }
  async start(win) {
    this.stop();
    const executable=await windowsHelper('DesktopLayer',this.directory,this.resources);
    if(win.isDestroyed())return;
    this.child=spawn(executable,[windowHandle(win.getNativeWindowHandle()),String(process.pid)],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    const child=this.child;
    const fail=()=>{if(this.child!==child)return;this.available=false;this.stop();};
    this.child.on('error',fail);this.child.on('exit',fail);this.child.stdin.on('error',fail);
    createInterface({input:this.child.stdout}).on('line',line=>{
      if(this.child!==child)return;
      try{this.available=JSON.parse(line).available===true;}catch{this.available=false;}
    });
    this.setInteractive(this.interactive);
  }
  setInteractive(active){this.interactive=Boolean(active);if(this.child?.stdin.writable)this.child.stdin.write(active?'interactive\n':'desktop\n');}
  stop(){const child=this.child;this.child=null;this.available=false;child?.kill();}
}
module.exports={WindowsDesktop,windowHandle};
