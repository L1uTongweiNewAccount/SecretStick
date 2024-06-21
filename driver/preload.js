const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    exit: () => ipcRenderer.invoke('app:exit'),
    list: () => ipcRenderer.invoke('serial:list'),
    check: (serialPath) => ipcRenderer.invoke('serial:check', serialPath),
    login: (serialPath, slot, password) => ipcRenderer.invoke('auth:login', serialPath, slot, password),
    logout: (serialPath) => ipcRenderer.invoke('auth:logout', serialPath),
    generate: (serialPath, slot, password) => ipcRenderer.invoke('auth:register', serialPath, slot, password),
    sign: (serialPath, data) => ipcRenderer.invoke('cryption:sign', serialPath, data),
    verify: (signed, pub) => ipcRenderer.invoke('cryption:verify', signed, pub),
    encrypt: (serialPath, data) => ipcRenderer.invoke('cryption:encrypt', serialPath, data),
    decrypt: (serialPath, data, iv) => ipcRenderer.invoke('cryption:decrypt', serialPath, data, iv),
    encryptShared: (serialPath, pub, data) => ipcRenderer.invoke('cryption:encryptShared', serialPath, pub, data),
    decryptShared: (serialPath, pub, data, iv) => ipcRenderer.invoke('cryption:decryptShared', serialPath, pub, data, iv),
    getPublicKey: (serialPath) => ipcRenderer.invoke('cryption:getPublicKey', serialPath),
})