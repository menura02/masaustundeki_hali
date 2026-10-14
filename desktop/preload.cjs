const { contextBridge, ipcRenderer, webUtils } = require('electron');
contextBridge.exposeInMainWorld('hali', {
  init: () => ipcRenderer.invoke('hali:init'),
  icons: () => ipcRenderer.invoke('hali:icons'),
  watchIcons: active => ipcRenderer.send('hali:icons-watch',Boolean(active)),
  startupStatus: () => ipcRenderer.invoke('hali:startup-status'),
  setStartup: enabled => ipcRenderer.invoke('hali:startup-set', enabled),
  startupSettings: () => ipcRenderer.invoke('hali:startup-settings'),
  retryIcons: () => ipcRenderer.invoke('hali:icons-retry'),
  stash: (files, position) => ipcRenderer.invoke('hali:stash', files.map(f => webUtils.getPathForFile(f)), position),
  restore: id => ipcRenderer.invoke('hali:restore', id),
  mouse: active => ipcRenderer.send('hali:mouse', Boolean(active)),
  menuOpen: open => ipcRenderer.send('hali:menu-open', Boolean(open)),
  action: name => ipcRenderer.send('hali:action', name),
  save: value => ipcRenderer.send('hali:save', value),
  onUpdate: callback => ipcRenderer.on('hali:update', (_event, data) => callback(data)),
  onAction: callback => ipcRenderer.on('hali:command', (_event, name) => callback(name))
});
