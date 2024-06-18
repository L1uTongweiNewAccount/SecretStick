const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('node:path')
const util = require('util');
const {SerialPort} = require('serialport');
const crypto = require('node:crypto');
const SHA256 = crypto.createHash('sha256');

async function handleFileOpen(){
    const { canceled, filePaths } = await dialog.showOpenDialog();
    if (!canceled) {
        return filePaths[0];
    }
}

async function handleList(){
    return SerialPort.list();
}

async function handleCheck(port){
    var serial = new SerialPort(port, {autoOpen: false, baudRate: 115200});
    return serial.open().then(() => {
        serial.write(Buffer.from([0]));
        return serial.drain().then(() => {
            return new Promise((resolve) => {
                serial.on('readable', () => {
                    resolve(serial.read(7) == "SSv1.0");
                });
            }).then(() => {serial.close()});
        });
    });
}

async function handleExit(){
    app.quit();
}

async function handleLogin(port, slot, password){
    var serial = new SerialPort(port, {baudRate: 115200});
    SHA256.update(password);
    serial.write("01" + ((slot < 100) ? "0" : "") + toString(slot) + SHA256.digest('binary'));
    return serial.drain().then(() => {
        return new Promise((resolve) => {
            serial.on('readable', () => {
                resolve(serial.read(2) == "0");
            });
        }).then(() => {serial.close()});
    });
}

async function handleLogout(port){
    var serial = new SerialPort(port, {baudRate: 115200});
    SHA256.update(password);
    serial.write("10");
    return 1;
}

const createWindow = () => {
    const win = new BrowserWindow({
        title: "SecretStick",
        width: 800,
        height: 600
    });
    win.loadFile('index.html');
}

app.whenReady().then(() => {
    ipcMain.handle('dialog:openFile', handleFileOpen);
    ipcMain.handle('app:list', handleExit);
    ipcMain.handle('serial:list', handleList);
    ipcMain.handle('serial:check', handleCheck);
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