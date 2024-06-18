const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    login: (slot, password) => ipcRenderer.invoke('auth:login', slot, password),
    logout: () => ipcRenderer.invoke('auth:logout')
})