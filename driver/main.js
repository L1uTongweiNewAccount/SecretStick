const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('node:path')
const util = require('util');
const fs = require('fs');
const {SerialPort} = require('serialport');
const crypto = require('node:crypto');
const eccrypto = require('eccrypto');
const SHA256 = crypto.createHash('sha256');

async function handleFileOpen(){
    const { canceled, filePaths } = await dialog.showOpenDialog();
    if (!canceled) {
        return fs.readFileSync(filePaths[0]);
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
    serial.write("02" + ((slot < 100) ? "0" : "") + toString(slot) + SHA256.digest('binary'));
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                resolve(serial.read(2) == "0");
            });
        });
        serial.close();
    });
}

async function handleGenerate(port, slot, password){
    var serial = new SerialPort(port, {baudRate: 115200});
    SHA256.update(password);
    serial.write("01" + ((slot < 100) ? "0" : "") + toString(slot) + SHA256.digest('binary'));
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                resolve(serial.read(2) == "0");
            });
        });
        serial.close();
    });
}

async function handleLogout(port){
    var serial = new SerialPort(port, {baudRate: 115200});
    SHA256.update(password);
    serial.write("10");
    return 1;
}

async function handleSign(port, data){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("08\0\x20" + data);
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                resolve(serial.read(64));
            });
        });
        serial.close();
    });
}

async function handleVerify(signed, pub){
    return eccrypto.verify(Buffer.from(pub), Buffer.from(signed.hash, 'base64'), Buffer.from(signed.sign, 'base64'))
        .then(() => {return 1;})
        .catch(() => {return 0;});
}

async function handleDecrypt(port, data, iv){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("05\x22\x02" + Buffer.from(iv, 'base64').toString('binary') + Buffer.from(data, 'base64').toString('binary'));
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                var dat = Buffer.from(serial.read(544));
                resolve(dat.toString('binary'));
            });
        });
        serial.close();
    });
}

async function handleDecryptShared(port, pub, data, iv){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("05\x24\x08" + Buffer.from(pub, 'base64').toString('binary') + Buffer.from(iv, 'base64').toString('binary') + Buffer.from(data, 'base64').toString('binary'));
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                var dat = Buffer.from(serial.read(544));
                resolve(dat.toString('binary'));
            });
        });
        serial.close();
    });
}

async function handleEncrypt(port, data){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("05\x20\x02" + data);
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                var dat = Buffer.from(serial.read(544));
                resolve(JSON.stringify({ data: dat.subarray(0, 512), iv: dat.subarray(512, 544) }));
            });
        });
        serial.close();
    });
}

async function handleEncryptShared(port, pub, data){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("03\x22\x0A" + Buffer.from(pub, 'base64').toString('binary') + data);
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                var dat = Buffer.from(serial.read(544));
                resolve(JSON.stringify({ data: dat.subarray(0, 512), iv: dat.subarray(512, 544) }));
            });
        });
        serial.close();
    });
}

async function handleGetPublicKey(port){
    var serial = new SerialPort(port, {baudRate: 115200});
    serial.write("07");
    return serial.drain().then(async () => {
        return await new Promise((resolve) => {
            serial.on('readable', () => {
                var dat = Buffer.from(serial.read(40));
                resolve(dat.toString('base64'));
            });
        });
        serial.close();
    });
}

const createWindow = () => {
    const win = new BrowserWindow({
        title: "SecretStick",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });
    win.maximize();
    win.loadFile('index.html');
    win.show();
}

app.whenReady().then(() => {
    ipcMain.handle('dialog:openFile', handleFileOpen);
    ipcMain.handle('app:exit', handleExit);
    ipcMain.handle('serial:list', handleList);
    ipcMain.handle('serial:check', handleCheck);
    ipcMain.handle('auth:login', handleLogin);
    ipcMain.handle('auth:logout', handleLogout);
    ipcMain.handle('auth:register', handleGenerate);
    ipcMain.handle('cryption:sign', handleSign);
    ipcMain.handle('cryption:verify', handleVerify);
    ipcMain.handle('cryption:encrypt', handleEncrypt);
    ipcMain.handle('cryption:decrypt', handleDecrypt);
    ipcMain.handle('cryption:encryptShared', handleEncryptShared);
    ipcMain.handle('cryption:decryptShared', handleDecryptShared);
    ipcMain.handle('cryption:getPublicKey', handleGetPublicKey);
    createWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
  })
  
app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') app.quit();
})