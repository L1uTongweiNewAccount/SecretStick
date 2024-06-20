#include "../../Inc/main.h"
#include "tiny_sha3/sha3.h"
#include "tiny-AES/aes.h"
#include "micro-ecc/uECC.h"
#include "micro-ecc/uECC_vli.h"
#include "micro-ecc/types.h"
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

extern SPI_HandleTypeDef hspi1;
extern UART_HandleTypeDef huart1;

#define recvLength 1024
uint8_t recvBuffer[recvLength];

static int RNG(uint8_t *dest, unsigned size){
    srand(HAL_GetTick());
    while(size--){
        *dest = (uint8_t)rand();
    }
    return 1;
}

void SendString(char* str){
    HAL_UART_Transmit(&huart1, str, strlen(str), 1000);
}

uint8_t buf256[32], buf256_2[32], bufPublic[64], privateKey[32], publicKey[40], slotNow = -1;
uECC_Curve curve;

void writeFRAM(uint16_t address, uint8_t* buf, uint16_t len){
    uint8_t opcode = 0b00000010;
    while(len--){
        HAL_SPI_Transmit(&hspi1, &opcode, 1, 100);
        HAL_SPI_Transmit(&hspi1, &address, 2, 100);
        HAL_SPI_Transmit(&hspi1, buf, 1, 100);
        buf++;
    }
}

void readFRAM(uint16_t address, uint8_t* buf, uint16_t len){
    uint8_t opcode = 0b00000011;
    while(len--){
        HAL_SPI_Transmit(&hspi1, &opcode, 1, 100);
        HAL_SPI_Transmit(&hspi1, &address, 2, 100);
        HAL_SPI_Receive(&hspi1, buf, 1, 100);
        buf++;
    }
}

void cleanFRAM(uint16_t address, uint16_t len){
    uint8_t opcode = 0b00000010, data = 0;
    while(len--){
        HAL_SPI_Transmit(&hspi1, &opcode, 1, 100);
        HAL_SPI_Transmit(&hspi1, &address, 2, 100);
        HAL_SPI_Receive(&hspi1, &data, 1, 100);
    }
}

char ret = '\n';
void handler(){
    int cmd = (recvBuffer[0] - '0') * 10 + (recvBuffer[1] - '0');
    switch(cmd){
        default:
            SendString("0");
            break;
        case 0: { //check
            SendString("SSv1.0");
            break;
        }
        case 1: { //generate
            //slot(3, 2-4) pass(32, 5-36)
            struct AES_ctx ctx;
            uint8_t slot = (recvBuffer[2] - '0') * 100 + (recvBuffer[3] - '0') * 10 + (recvBuffer[4] - '0');
            if(slot < 0 || slot > 101){
                SendString("0");
                break;
            }
            RNG(buf256_2, 32);
            AES_init_ctx_iv(&ctx, recvBuffer + 5, buf256_2);
            uECC_make_key(publicKey, privateKey, curve);
            memset(buf256, 0, 32);
            memcpy(buf256, privateKey, 21);
            AES_CBC_encrypt_buffer(&ctx, buf256, 32);
            writeFRAM(80 * slot, buf256, 32);
            writeFRAM(80 * slot + 32, buf256_2, 32);
            sha3(recvBuffer + 5, 32, buf256, 16);
            writeFRAM(80 * slot + 64, buf256, 16);
            slotNow = slot;
            SendString("0");
            break;
        }
        case 2: { //unlock
            //slot(3, 2-4) pass(32, 5-36)
            struct AES_ctx ctx;
            uint8_t slot = (recvBuffer[2] - '0') * 100 + (recvBuffer[3] - '0') * 10 + (recvBuffer[4] - '0');
            if(slot < 0 || slot > 101){
                SendString("0");
                break;
            }
            memset(privateKey, 0, 21);
            memset(publicKey, 0, 40);
            readFRAM(80 * slot + 64, buf256, 16);
            sha3(recvBuffer + 5, 32, buf256_2, 16);
            if(!memcmp(buf256, buf256_2, 16)){
                SendString("1");
                break;
            }
            memset(buf256, 0, 32);
            memset(buf256_2, 0, 32);
            readFRAM(64 * slot, privateKey, 32);
            readFRAM(64 * slot + 32, buf256_2, 32);
            AES_init_ctx_iv(&ctx, recvBuffer + 5, buf256_2);
            AES_CBC_decrypt_buffer(&ctx, privateKey, 32);
            uECC_compute_public_key(privateKey, publicKey, curve);
            slotNow = slot;
            SendString("0");
            break;
        }
        case 3: { //shareKeyEncrypt
            //length(2, 2-3) public(40, 4-43) data(len - 44, 44-end)
            if(slotNow == -1){
                SendString("1");
                break;
            }
            struct AES_ctx ctx;
            RNG(buf256_2, 32);
            sha3(buf256_2, 32, buf256_2, 32);
            uECC_shared_secret(recvBuffer + 4, privateKey, buf256, curve);
            sha3(buf256, 20, buf256, 32);
            AES_init_ctx_iv(&ctx, buf256, buf256_2);
            long len = *(uint16_t*)(recvBuffer + 2) - 44;
            if(len < 42 || len > 1024 - 44) break;
            size_t cryptlen = (len / 16 + len % 16) * 16;
            AES_CBC_encrypt_buffer(&ctx, recvBuffer + 46, cryptlen);
            HAL_UART_Transmit(&huart1, buf256_2, 32, 100);
            HAL_UART_Transmit(&huart1, recvBuffer + 46, cryptlen, 100);
            break;
        }
        case 4: { //shareKeyDecrypt
            //length(2, 2-3) public(40, 4-43) iv(32, 44-75) data(xx, 76-end)
            if(slotNow == -1){
                SendString("1");
                break;
            }
            struct AES_ctx ctx;
            long len = *(uint16_t*)(recvBuffer + 2) - 76;
            if(len < 42 || len > 1024 - 76) break;
            uECC_shared_secret(recvBuffer + 4, privateKey, buf256, curve);
            sha3(buf256, 20, buf256, 32);
            AES_init_ctx_iv(&ctx, buf256, recvBuffer + 44);
            AES_CBC_decrypt_buffer(&ctx, recvBuffer + 76, len);
            HAL_UART_Transmit(&huart1, recvBuffer + 76, len, 100);
            break;
        }
        case 5: { //encrypt
            //length(2, 2-3) data(xx, 4-end)
            if(slotNow == -1){
                SendString("1");
                break;
            }
            struct AES_ctx ctx;
            long len = *(uint16_t*)(recvBuffer + 2) - 4;
            if(len < 42 || len > 1024 - 4) break;
            RNG(buf256_2, 32);
            sha3(buf256_2, 32, buf256_2, 32);
            sha3(privateKey, 21, buf256, 32);
            AES_init_ctx_iv(&ctx, buf256, buf256_2);
            size_t cryptlen = (len / 16 + len % 16) * 16;
            AES_CBC_encrypt_buffer(&ctx, recvBuffer + 4, cryptlen);
            HAL_UART_Transmit(&huart1, buf256_2, 32, 100);
            HAL_UART_Transmit(&huart1, recvBuffer + 4, cryptlen, 100);
            break;
        }
        case 6: { //decrypt
            //length(2, 2-3) iv(32, 4-35) data(xx, 36-end)
            if(slotNow == -1){
                SendString("1");
                break;
            }
            struct AES_ctx ctx;
            long len = *(uint16_t*)(recvBuffer + 2) - 36;
            if(len < 42 || len > 1024 - 36) break;
            sha3(privateKey, 21, buf256, 32);
            AES_init_ctx_iv(&ctx, buf256, recvBuffer + 4);
            AES_CBC_decrypt_buffer(&ctx, recvBuffer + 36, len);
            HAL_UART_Transmit(&huart1, recvBuffer + 36, len, 100);
            break;
        }
        case 7: { //getPublicKey
            if(slotNow == -1){
                SendString("1");
                break;
            }
            HAL_UART_Transmit(&huart1, publicKey, 40, 100);
            break;
        }
        case 8: { //signature
            //length(2, 2-3) hash(xx, 4-end)
            if(slotNow == -1){
                SendString("1");
                break;
            }
            long len = *(uint16_t*)(recvBuffer + 2) - 4;
            uECC_sign(privateKey, recvBuffer + 4, len, bufPublic, curve);
            HAL_UART_Transmit(&huart1, bufPublic, 64, 100);
            break;
        }
        case 10: { //close
            memset(privateKey, 0, 21);
            memset(publicKey, 0, 40);
            slotNow = -1;
            SendString("0");
            break;
        }
        case 11: { //clean
            cleanFRAM(80 * slotNow, 80);
            slotNow = -1;
            SendString("0");
            break;
        }
        case 12: { //cleanAll
            cleanFRAM(0, 8192);
            slotNow = -1;
            SendString("0");
            break;
        }
    }
    memset(buf256, 0, 32);
    memset(buf256_2, 0, 32);
    memset(bufPublic, 0, 64);
}   

void UserMain(){
    char ch = 0;
    long Receiveed_length = 0;
    uECC_set_rng(RNG);
    curve = uECC_secp256k1();
    HAL_UART_EnableReceiverTimeout(&huart1);
    while(1){
        HAL_StatusTypeDef status = HAL_UART_Receive(&huart1, recvBuffer, 2, 50);
        if(status != HAL_OK) continue;
        int8_t cmd = (recvBuffer[0] - '0') * 10 + (recvBuffer[1] - '0');
        if(cmd > 12) continue;
        if(cmd == 0 || cmd == 10 || cmd == 11 || cmd == 12) handler();
        if(cmd == 1 || cmd == 2){
            HAL_UART_Receive(&huart1, recvBuffer + 2, 37, 100);
            handler();
        }else{
            HAL_UART_Receive(&huart1, recvBuffer + 2, 2, 100);
            int16_t length = *(uint16_t*)(recvBuffer + 2);
            HAL_UART_Receive(&huart1, recvBuffer + 4, length - 4, 100);
            handler();
        }
        memset(recvBuffer, 0, recvLength);
    }
}