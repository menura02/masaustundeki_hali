const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

function parseFinderResult(stdout) {
  const data = JSON.parse(stdout);
  if (typeof data.available !== 'boolean' || !Array.isArray(data.icons)) throw new Error('Finder yanıtı geçersiz.');
  return { available: data.available, coordinateSpace: 'dip', permissionRequired: Boolean(data.permissionRequired),
    error: typeof data.error === 'string' ? data.error : undefined,
    icons: data.available ? data.icons.filter(p => typeof p.name === 'string' && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({ name:p.name, x:p.x, y:p.y, width:0, height:0 })) : [] };
}
class MacDesktopIcons {
  constructor({ run = promisify(execFile), interval = 5000, scriptPath = path.join(__dirname,'FinderIcons.js') } = {}) {
    this.run = run; this.interval = interval; this.generation = 0;
    this.scriptPath = scriptPath;
    this.state = { available:false, icons:[], coordinateSpace:'dip' };
  }
  async start() {
    this.stop(); const generation = this.generation;
    const scan = async () => {
      let state;
      try {
        const task = this.run('/usr/bin/osascript', ['-l','JavaScript',this.scriptPath], { timeout:15000, maxBuffer:2*1024*1024 });
        this.child=task.child;
        const result = await task;
        state = parseFinderResult(result.stdout);
      } catch (error) {
        state = { available:false, icons:[], coordinateSpace:'dip',
          permissionRequired:Boolean(error.killed) || /1743|not authorized|not permitted/i.test(error.stderr || error.message), error:error.message };
      }
      if (generation !== this.generation) return;
      this.child=null;
      this.state = state;
      // Do not repeatedly request denied Automation permission. Retry is a user action.
      if (!state.permissionRequired) this.timer = setTimeout(scan, this.interval);
    };
    await scan();
  }
  stop() { this.generation++; clearTimeout(this.timer);const child=this.child;this.child=null;child?.kill(); }
}
module.exports = { MacDesktopIcons, parseFinderResult };
