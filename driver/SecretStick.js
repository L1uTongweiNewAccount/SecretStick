const {SerialPort} = require('serialport')
const yargs = require("yargs");
const fs = require('node:fs');
const eccrypto = require('eccrypto');
const {sprintf} = require('sprintf.js');

function portAvailable(ports){
    const testPort = new SerialPort(ports.path, {baudRate: 115200}, (err) => {
        if(err) {
            console.log(err);
            return Promise.resolve("false");
        }
        testPort.write("00");
        return testPort.drain().then((err) => {
            if(err) console.log(err);
            return new Promise((resolve, reject) => {
                port.on('data', (data) => {
                    if(data.toString() == "SSv1.0"){
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
            if(data.toString() == "1"){
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
            if(data.toString().length == 1){
                console.log(parsedData.msg);
                process.exit(0);
            }
            var buf = Buffer.from(data, 'binary');
            if(withiv) console.log("iv = %s\ndata = %s", buf.subarray(0, 32).toString('base64'), buf.subarray(32).toString('base64'));
            else console.log("data = %s", buf.toString('base64'));
            process.exit(0);
        });
    });
}

function parseEncryptFile(port, filename){
    return port.drain().then((resolve, reject) => {
        if(err) console.log(err);
        port.on('data', (data) => {
            fs.writeFileSync(filename, JSON.stringify({data: buf.subarray(32).toString('base64'), iv: buf.subarray(0, 32).toString('base64')}) + "\n", {flag: 'a'});
            resolve();
        });
    });
}

function parseDecryptFile(port, filename){
    return port.drain().then((resolve, reject) => {
        if(err) console.log(err);
        port.on('data', (data) => {
            fs.writeFileSync(filename, data.toString('binary'), {flag: 'a'});
            resolve();
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
    .option('shareKeyEncrypt', {type: "boolean", describe: 'Use shared key to encrypt, --port, --publicKey, --data(File, String or RawString) required.'})
    .option('shareKeyDecrypt', {type: "boolean", describe: 'Use shared key to decrypt, --port, --publicKey, --data(File or String), --iv required.'})
    .option('encrypt', {type: "boolean", describe: 'Use private key to encrypt, --port, --data(File, String or RawString) required.'})
    .option('decrypt', {type: "boolean", describe: 'Use private key to decrypt, --port, --data(File or String), --iv required.'})
    .option('encryptFile', {type: "boolean", describe: 'Use private key to encrypt a file, --port, --dataFile required.'})
    .option('decryptFile', {type: "boolean", describe: 'Use private key to decrypt a file, --port, --dataFile required.'})
    .option('getPublicKey', {type: "boolean", describe: 'Get public key, --port required.'})
    .option('signature', {type: "boolean", describe: 'Sign the hashed data, --port,--data(File or String) required.'})
    .option('verify', {type: "boolean", describe: 'Verify the signature, --port, --data(File or String), --sign required.'})
    .option('close', {type: "boolean", describe: 'Close a key slot, --port required.'})
    .option('clean', {type: "boolean", describe: 'Clean opened key slot, --port required.'})
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
    .option('sign', {type: "string", describe: 'Signature.', alias: 's'}).argv;

var data = "";
if(!argv.encryptFile && !argv.decryptFile){
    if(argv.dataFile || argv.dataString || argv.dataRawString){
        if(argv.dataFile){
            data = fs.readFileSync(argv.dataFile);
        }else if(argv.dataString){
            data = Buffer.from(argv.dataString, 'base64').toString('binary');
        }else{
            data = argv.dataRawString;
        }
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
    var outbuf = "";
    const port = new SerialPort(argv.port, {baudRate: 115200}).then((err) => {
        if(argv.generate){
            var pass = Buffer.from(sha256(argv.password), 'hex').toString('binary');
            sprintf(outbuf, "01%03d%s", slot, pass);
            port.write(outbuf);
            return parseMassage(port, "Successed create a secp256k1 ECC key pair in Slot %d, Serial Port %s.", argv.slot, argv.port);
        }else if(argv.unlock){
            var pass = Buffer.from(sha256(argv.password), 'hex').toString('binary');
            sprintf(outbuf, "02%03d%s", slot, pass);
            port.write(outbuf);
            return parseMassage(port, "Successed open Slot %d in Serial Port %s.", argv.slot, argv.port);
        }else if(argv.shareKeyEncrypt){
            sprintf(outbuf, "03%s%s%s", Buffer.from(42 + data.length).toString('binary'), Buffer.from(argv.publicKey, 'base64').toString('binary'), data);
            port.write(outbuf);
            return writeData(port, true);
        }else if(argv.shareKeyDecrypt){
            sprintf(outbuf, "04%s%s%s%s", Buffer.from(76 + data.length).toString('binary'), Buffer.from(argv.publicKey, 'base64').toString('binary'), 
                Buffer.from(argv.iv, 'base64').toString('binary'), data);
            port.write(outbuf);
            return writeData(port, false);
        }else if(argv.encrypt){
            sprintf(outbuf, "05%s%s", Buffer.from(4 + data.length).toString('binary'), data);
            port.write(outbuf);
            return writeData(port, true);
        }else if(argv.decrypt){
            sprintf(outbuf, "06%s%s%s%s", Buffer.from(36 + data.length).toString('binary'), Buffer.from(argv.iv, 'base64').toString('binary'), data);
            port.write(outbuf);
            return writeData(port, false);
        }else if(argv.getPublicKey){
            port.write("07");
            return writeData(port, false);
        }else if(argv.signature){
            sprintf(outbuf, "08%s%s%s", Buffer.from(4 + data.length).toString('binary'), data);
            port.write(outbuf);
            return writeData(port, false);
        }else if(argv.verify){
            return eccrypto.verify(fs.readFileSync(argv.publicKey).toString('ascii'), data, argv.sign).then((res) => {
                if(!res){
                    console.log("Verify Failed.");
                    process.exit(1);
                }
                console.log("Verify Successed.");
                process.exit(0);
            });
        }else if(argv.close){
            port.write("10");
            return parseMassage(port, "Successed close Serial Port %s.", argv.slot, argv.port);
        }else if(argv.clean){
            port.write("11");
            return parseMassage(port, "Successed clean Slot %d in Serial Port %s.", argv.slot, argv.port);
        }else if(argv.cleanAll){
            port.write("12");
            return parseMassage(port, "Successed clean all Slots in Serial Port %s.", argv.slot, argv.port);
        }else if(argv.encryptFile){
            var buffer = fs.readFileSync(argv.dataFile);
            var blockNumber = Math.ceil(buffer.length / 512.0);
            var taskList = new Array();
            for(var i = 0; i < blockNumber; i++){
                var l = 512 * i, r = min(512 * i + 512, buffer.length);
                taskList.push(new Promise(() => {
                    var _outbuf = "";
                    var Data = Buffer.subarray(l, r).toString('binary');
                    sprintf(_outbuf, "05%s%s", Buffer.from(4 + Data.length).toString('binary'), Data);
                    port.write(_outbuf);
                    return parseEncryptFile(port, argv.dataFile + ".encrypted");
                }));
            }
            Promise.allSettled(taskList);
        }else if(argv.decryptFile){
            var buffer = fs.readFileSync(argv.dataFile).toString().split('\n');
            var taskList = new Array();
            for(var i = 0; i < buffer.length; i++){
                taskList.push(((buf) => {
                    var contents = JSON.parse(buf);
                    return new Promise(() => {
                        var _outbuf = "";
                        var iv = Buffer.from(contents.iv).toString('binary');
                        var Data = Buffer.from(contents.data).toString('binary');
                        sprintf(_outbuf, "06%s%s%s", Buffer.from(36 + contents.data.length).toString('binary'), iv, Data);
                        port.write(_outbuf);
                        return parseDecryptFile(port, argv.dataFile + ".decrypted");
                    })
                })(buffer[i]));
            }
            Promise.allSettled(taskList);
        }
    });
}

function sha256(s) {
    const chrsz = 8
    const hexcase = 0

    function safe_add(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF)
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
        return (msw << 16) | (lsw & 0xFFFF)
    }

    function S(X, n) {
        return (X >>> n) | (X << (32 - n))
    }

    function R(X, n) {
        return (X >>> n)
    }

    function Ch(x, y, z) {
        return ((x & y) ^ ((~x) & z))
    }

    function Maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z))
    }

    function Sigma0256(x) {
        return (S(x, 2) ^ S(x, 13) ^ S(x, 22))
    }

    function Sigma1256(x) {
        return (S(x, 6) ^ S(x, 11) ^ S(x, 25))
    }

    function Gamma0256(x) {
        return (S(x, 7) ^ S(x, 18) ^ R(x, 3))
    }

    function Gamma1256(x) {
        return (S(x, 17) ^ S(x, 19) ^ R(x, 10))
    }

    function core_sha256(m, l) {
        const K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2]
        const HASH = [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19]
        const W = new Array(64)
        let a, b, c, d, e, f, g, h, i, j
        let T1, T2
        m[l >> 5] |= 0x80 << (24 - l % 32)
        m[((l + 64 >> 9) << 4) + 15] = l
        for (i = 0; i < m.length; i += 16) {
            a = HASH[0]
            b = HASH[1]
            c = HASH[2]
            d = HASH[3]
            e = HASH[4]
            f = HASH[5]
            g = HASH[6]
            h = HASH[7]
            for (j = 0; j < 64; j++) {
                if (j < 16) {
                    W[j] = m[j + i]
                } else {
                    W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16])
                }
                T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j])
                T2 = safe_add(Sigma0256(a), Maj(a, b, c))
                h = g
                g = f
                f = e
                e = safe_add(d, T1)
                d = c
                c = b
                b = a
                a = safe_add(T1, T2)
            }
            HASH[0] = safe_add(a, HASH[0])
            HASH[1] = safe_add(b, HASH[1])
            HASH[2] = safe_add(c, HASH[2])
            HASH[3] = safe_add(d, HASH[3])
            HASH[4] = safe_add(e, HASH[4])
            HASH[5] = safe_add(f, HASH[5])
            HASH[6] = safe_add(g, HASH[6])
            HASH[7] = safe_add(h, HASH[7])
        }
        return HASH
    }

    function str2binb(str) {
        const bin = []
        const mask = (1 << chrsz) - 1
        for (let i = 0; i < str.length * chrsz; i += chrsz) {
            bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32)
        }
        return bin
    }

    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, '\n')
        let utfText = ''
        for (let n = 0; n < string.length; n++) {
            const c = string.charCodeAt(n)
            if (c < 128) {
                utfText += String.fromCharCode(c)
            } else if ((c > 127) && (c < 2048)) {
                utfText += String.fromCharCode((c >> 6) | 192)
                utfText += String.fromCharCode((c & 63) | 128)
            } else {
                utfText += String.fromCharCode((c >> 12) | 224)
                utfText += String.fromCharCode(((c >> 6) & 63) | 128)
                utfText += String.fromCharCode((c & 63) | 128)
            }
        }
        return utfText
    }

    function binb2hex(binarray) {
        const hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef'
        let str = ''
        for (let i = 0; i < binarray.length * 4; i++) {
            str += hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
                hex_tab.charAt((binarray[i >> 2] >> ((3 - i % 4) * 8)) & 0xF)
        }
        return str
    }
    s = Utf8Encode(s)
    return binb2hex(core_sha256(str2binb(s), s.length * chrsz))
}