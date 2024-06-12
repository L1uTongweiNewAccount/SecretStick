const {SerialPort} = require('serialport')
const yargs = require("yargs");
const fs = require('node:fs');
const eccrypto = require('eccrypto');

function portAvailable(ports){
    const testPort = new SerialPort(ports.path, {baudRate: 115200}, (err) => {
        if(err) {
            console.log(err);
            return Promise.resolve("false");
        }
        testPort.write(JSON.stringify({cmd: 0}));
        return testPort.drain().then((err) => {
            if(err) console.log(err);
            return new Promise((resolve, reject) => {
                port.on('data', (data) => {
                    try{
                        var parsedData = JSON.parse(data.toString());
                    }catch(err){
                        console.log(err);
                        resolve("false");
                    }
                    if(parsedData.code == 0 && parsedData.msg == "SecretStick Firmware"){
                        resolve("true");
                    }
                    resolve("false");
                });
            });
        });
    });
}

function parseMassage(port, onsuccess, ...params){
    return port.drain().then((err) => {
        if(err) console.log(err);
        port.on('data', (data) => {
            try{
                var parsedData = JSON.parse(data.toString());
            }catch(err){
                console.log(err);
                process.exit(1);
            }
            if(parsedData.code == 0){
                console.log(onsuccess, params);
                process.exit(0);
            }
            console.log(parsedData.msg);
            process.exit(0);
        });
    });
}

function writeData(port, withiv){
    return port.drain().then((err) => {
        if(err) console.log(err);
        port.on('data', (data) => {
            try{
                var parsedData = JSON.parse(data.toString());
            }catch(err){
                console.log(err);
                process.exit(1);
            }
            if(parsedData.code == 0){
                if(argv.outputBase64) fs.writeFileSync(argv.output, parsedData.data);
                else fs.writeFileSync(argv.output, Buffer.from(parsedData.data, 'base64').toString('binary'));
                if(argv.output != '/dev/console' && argv.output != 'con'){
                    console.log("Success write correct data to %s", argv.output);
                    if(withiv) console.log("And also remember the iv = %s", parsedData.iv);
                    process.exit(0);
                }
                process.exit(0);
            }
            console.log(parsedData.msg);
            process.exit(0);
        });
    });
}

var argv = yargs(process.argv)
    .strict()
    .recommendCommands()
    .wrap(yargs.terminalWidth())
    .demandCommand(1, 'A command is required. Pass --help to see all available commands and options.')
    .usage('Usage: ' + process.argv0 + ' <options>')
    .epilog("Author: L1uTongwei<1347277058@qq.com>\nThis program comes with ABSOLUTELY NO WARRANTY;\n" +
        "This is free software, and you are welcome to redistribute it under certain conditions.\n" +
        "For more information, please visit https://github.com/L1uTongweiNewAccount/SecretStick")
    .version("Secret Stick Driver v1.0")

    .group(['list', 'generate', 'unlock', 'shareKeyEncrypt', 'shareKeyDecrypt', 'encrypt', 'decrypt', 'getPublicKey', 'signature', 'verify', 'close', 'clean', 'cleanAll'], "Commands:")
    .option('list', {type: "boolean", describe: 'List available serial ports.'})
    .option('generate', {type: "boolean", describe: 'Generate a key slot, --port, --slot, --password required. (Will remove old data automaticly!)'})
    .option('unlock', {type: "boolean", describe: 'Unlock a key slot, --port, --slot, --password required.'})
    .option('shareKeyEncrypt', {type: "boolean", describe: 'Use shared key to encrypt, --port, --slot, --publicKey, --data(File, String or RawString), --output required.'})
    .option('shareKeyDecrypt', {type: "boolean", describe: 'Use shared key to decrypt, --port, --slot, --publicKey, --data(File or String), --iv, --output required.'})
    .option('encrypt', {type: "boolean", describe: 'Use private key to encrypt, --port, --slot, --data(File, String or RawString), --iv, --output required.'})
    .option('decrypt', {type: "boolean", describe: 'Use private key to decrypt, --port, --slot, --data(File or String), --output required.'})
    .option('getPublicKey', {type: "boolean", describe: 'Get public key, --port, --slot, --output required.'})
    .option('signature', {type: "boolean", describe: 'Sign the hashed data, --port, --slot, --data(File or String), --output required.'})
    .option('verify', {type: "boolean", describe: 'Verify the signature, --port, --slot, --data(File or String), --sign required.'})
    .option('close', {type: "boolean", describe: 'Close a key slot, --port, --slot required.'})
    .option('clean', {type: "boolean", describe: 'Clean a key slot, --port, --slot required.'})
    .option('cleanAll', {type: "boolean", describe: 'Clean the FRAM, --port required.'})

    .group(['port', 'slot', 'password', 'publicKey', 'dataFile', 'dataString', 'output', 'outputBase64', 'iv', 'sign'], 'Options:')
    .option('port', {type: "string", describe: 'Provide a serial port path for use.', alias: 'p'})
    .option('slot', {type: "int", describe: 'Slot number for use.', alias: 's'})
    .option('password', {type: "string", describe: 'Password for generate key or unlock.', alias: 'pass'})
    .option('publicKey', {type: "string", describe: 'Public Key File that from other key.', alias: 'pub'})
    .option('dataFile', {type: "string", describe: 'Data file to be encrypted, decrypted, signed or verifyed. Binary format.', alias: 'dfile'})
    .option('dataString', {type: "string", describe: 'Data string to be encrypted, decrypted, signed or verifyed. Base64 format.', alias: 'dstr'})
    .option('dataRawString', {type: "string", describe: 'Data string to be encrypted, decrypted, signed or verifyed. Raw format.', alias: 'rstr'})
    .option('iv', {type: "string", describe: 'Encrypted data iv.'})
    .option('sign', {type: "string", describe: 'Signature.', alias: 's'})
    .option('output', {type: "string", describe: 'Output file name. /dev/console or con will output to console.', alias: 'o'})
    .option('outputBase64', {type: "boolean", describe: 'Output as Base64 format.', alias: 'b'}).argv;

var data = "";
if(argv.dataFile || argv.dataString || argv.dataRawString){
    if(argv.dataFile){
        data = fs.readFileSync(argv.dataFile).toString('base64');
    }else if(argv.dataString){
        data = argv.dataString;
    }else{
        data = Buffer.from(argv.dataRawString).toString('base64');
    }
}

if(argv.list){
    var portsList = new Array();
    SerialPort.list().then((ports) => {
        if(ports.length == 0){
            console.log("No Serial port availabled. Please check your plug.");
            return;
        }
        for(var i = 0; i < ports; i++){
            portsList.push(new Promise(portAvailable(ports[i]).then((res) => {
                console.log("Serial Port: %s, Available: %s", ports[i].path, res);
            })));
        }
    }).catch((err) => {
        console.log(err);
    });
    Promise.all(portsList);
}else{
    const port = new SerialPort(argv.port, {baudRate: 115200}).then((err) => {
        if(argv.generate){
            port.write(JSON.stringify({cmd: 1, slot: argv.slot, pass: argv.password}));
            return parseMassage(port, "Successed create a secp256k1 ECC key pair in Slot %d, Serial Port %s.", argv.slot, argv.port);
        }else if(argv.unlock){
            port.write(JSON.stringify({cmd: 2, slot: argv.slot, pass: argv.password}));
            return parseMassage(port, "Successed open Slot %d in Serial Port %s.", argv.slot, argv.port);
        }else if(argv.shareKeyEncrypt){
            port.write(JSON.stringify({cmd: 3, slot: argv.slot, public: fs.readFileSync(argv.publicKey), data: data}));
            return writeData(port, true);
        }else if(argv.shareKeyDecrypt){
            port.write(JSON.stringify({cmd: 4, slot: argv.slot, public: fs.readFileSync(argv.publicKey), data: data, iv: argv.iv}));
            return writeData(port, false);
        }else if(argv.encrypt){
            port.write(JSON.stringify({cmd: 5, slot: argv.slot, data: data}));
            return writeData(port, true);
        }else if(argv.decrypt){
            port.write(JSON.stringify({cmd: 6, slot: argv.slot, data: data, iv: argv.iv}));
            return writeData(port, false);
        }else if(argv.getPublicKey){
            port.write(JSON.stringify({cmd: 7}));
            return writeData(port, false);
        }else if(argv.signature){
            port.write(JSON.stringify({cmd: 8, hash: data}));
            return writeData(port, false);
        }else if(sign.verify){
            return eccrypto.verify(Buffer.from(fs.readFileSync(argv.publicKey), 'base64').toString('binary'), data, argv.sign).then((res) => {
                if(!res){
                    console.log("Verify Failed.");
                    process.exit(1);
                }
                console.log("Verify Successed.");
                process.exit(0);
            });
        }else if(sign.close){
            port.write(JSON.stringify({cmd: 10, slot: argv.slot}));
            return parseMassage(port, "Successed close Slot %d in Serial Port %s.", argv.slot, argv.port);
        }else if(sign.clean){
            port.write(JSON.stringify({cmd: 11, slot: argv.slot}));
            return parseMassage(port, "Successed clean Slot %d in Serial Port %s.", argv.slot, argv.port);
        }else if(sign.cleanAll){
            port.write(JSON.stringify({cmd: 12}));
            return parseMassage(port, "Successed clean all Slots in Serial Port %s.", argv.slot, argv.port);
        }
    });
}