const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')

async function handleFileOpen(){
    const { canceled, filePaths } = await dialog.showOpenDialog();
    if (!canceled) {
        return filePaths[0];
    }
}

async function handleLogin(){
    
}

const createWindow = () => {
    const win = new BrowserWindow({
        title: "SecretStick",
        width: 800,
        height: 600
    })
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    ipcMain.handle('dialog:openFile', handleFileOpen);
    ipcMain.handle('auth:login', handleLogin);
    ipcMain.handle('auth:logout', handleLogout);
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
  })
  
app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
})