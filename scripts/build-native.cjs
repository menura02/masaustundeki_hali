const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'native/build'), { recursive: true });
if(process.platform==='win32'){
  const framework=path.join(process.env.WINDIR||'C:\\Windows','Microsoft.NET','Framework64','v4.0.30319');
  for(const name of ['DesktopIcons','DesktopLayer']){
    const refs=['/reference:System.Web.Extensions.dll'];
    if(name==='DesktopIcons')refs.push('/reference:'+path.join(framework,'Accessibility.dll'));
    execFileSync(path.join(framework,'csc.exe'),['/nologo','/target:exe','/out:'+path.join(root,'native/build',name+'.exe'),...refs,path.join(root,'desktop',name+'.cs')],{stdio:'inherit',windowsHide:true});
  }
  process.exit(0);
}
if(process.platform!=='darwin')throw new Error('Native build requires macOS or Windows.');
execFileSync('xcrun', ['clang++', '-bundle', '-undefined', 'dynamic_lookup', '-fobjc-arc',
  '-arch', 'arm64', '-arch', 'x86_64', '-mmacosx-version-min=12.0',
  '-framework', 'Cocoa', '-framework', 'CoreGraphics', '-framework','ServiceManagement',
  path.join(root, 'native/mac.mm'), '-o', path.join(root, 'native/build/desktop.node')], { stdio: 'inherit' });
