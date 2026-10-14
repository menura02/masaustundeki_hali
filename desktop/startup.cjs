const STARTUP_NAME = 'HaliDesktop';

class Startup {
  constructor(app, { platform = process.platform, executable = process.execPath, demo = false } = {}) {
    this.app = app;
    this.platform = platform;
    this.supported = !demo && (platform === 'win32' || (platform === 'darwin' && app.isPackaged));
    this.reason = demo ? 'demo' : platform === 'darwin' && !app.isPackaged ? 'packaged-required' : 'unsupported';
    this.options = platform === 'darwin' ? {} : { path: executable, args: app.isPackaged ? [] : [`"${app.getAppPath()}"`] };
  }
  status() {
    if (!this.supported) return { supported: false, enabled: false, reason: this.reason };
    const state = this.app.getLoginItemSettings(this.options);
    if (this.platform === 'darwin') {
      return { supported: true, enabled: state.status === 'enabled' || (!state.status && Boolean(state.openAtLogin)),
        requiresApproval: state.status === 'requires-approval', status: state.status || (state.openAtLogin ? 'enabled' : 'not-registered') };
    }
    const item = state.launchItems?.find(item => item.name === STARTUP_NAME);
    return { supported: true, enabled: Boolean(state.openAtLogin && item?.enabled !== false) };
  }
  set(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('Başlangıç ayarı geçersiz.');
    if (!this.supported) throw new Error(this.reason === 'packaged-required' ? 'macOS otomatik başlangıcı kurulu .app sürümünde kullanılabilir.' : 'Otomatik başlangıç bu modda kullanılamıyor.');
    this.app.setLoginItemSettings(this.platform === 'darwin' ? { openAtLogin: enabled } : { ...this.options, name: STARTUP_NAME, openAtLogin: enabled, enabled });
    const state = this.status();
    if (enabled && state.requiresApproval) return state;
    if (enabled && state.status === 'not-found') throw new Error('Uygulamayı Applications klasörüne taşıyıp yeniden deneyin.');
    if (state.enabled !== enabled || (!enabled && state.requiresApproval)) throw new Error('Otomatik başlangıç ayarı uygulanamadı.');
    return state;
  }
}
module.exports = { Startup, STARTUP_NAME };
