const STARTUP_NAME = 'HaliDesktop';

class Startup {
  constructor(app, { platform = process.platform, executable = process.execPath, demo = false } = {}) {
    this.app = app;
    this.supported = platform === 'win32' && !demo;
    this.options = { path: executable, args: app.isPackaged ? [] : [`"${app.getAppPath()}"`] };
  }
  status() {
    if (!this.supported) return { supported: false, enabled: false };
    const state = this.app.getLoginItemSettings(this.options);
    const item = state.launchItems?.find(item => item.name === STARTUP_NAME);
    return { supported: true, enabled: Boolean(state.openAtLogin && item?.enabled !== false) };
  }
  set(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('Başlangıç ayarı geçersiz.');
    if (!this.supported) throw new Error('Bu seçenek yalnızca Windows masaüstü uygulamasında kullanılabilir.');
    this.app.setLoginItemSettings({ ...this.options, name: STARTUP_NAME, openAtLogin: enabled, enabled });
    const state = this.status();
    if (state.enabled !== enabled) throw new Error('Windows başlangıç ayarı uygulanamadı.');
    return state;
  }
}
module.exports = { Startup, STARTUP_NAME };
