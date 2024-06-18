const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    exit: () => ipcRenderer.invoke('app:exit'),
    list: () => ipcRenderer.invoke('serial:list'),
    check: () => ipcRenderer.invoke('serial:check'),
    login: (serialPath, slot, password) => ipcRenderer.invoke('auth:login', serialPath, slot, password),
    logout: (serialPath) => ipcRenderer.invoke('auth:logout', serialPath)
})