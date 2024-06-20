#pragma once
#include <stdint.h>
#include <time.h>
#include <stdlib.h>
#include <stdio.h>
#include <signal.h>
#include <string.h>

#ifdef _WIN32
    #include <windows.h>
    HANDLE comHandle;
#else
    #include <fcntl.h>
    #include <unistd.h>
    #include <termios.h>
    #include <sys/types.h>
    #include <sys/stat.h>
    int comfd;
#endif

uint8_t FRAM[8192];

#define HAL_OK 1
typedef int HAL_StatusTypeDef;
typedef int UART_HandleTypeDef;

void UserMain();
uint32_t HAL_GetTick(){return clock();}
void HAL_UART_EnableReceiverTimeout(int* huart){}
HAL_StatusTypeDef HAL_UART_Receive(UART_HandleTypeDef *huart, uint8_t *pData, uint16_t Size, uint32_t Timeout){
    #ifdef _WIN32
        unsigned long wRLen, b = ReadFile(comHandle, pData, Size, &wRLen, NULL);
        return (b && wRLen > 0) ? HAL_OK : 0;
    #else
        int len = read(comfd, pData, Size);
        return (len > 0) ? HAL_OK : 0;
    #endif
}
HAL_StatusTypeDef HAL_UART_Transmit(UART_HandleTypeDef *huart, const uint8_t *pData, uint16_t Size, uint32_t Timeout){
    #ifdef _WIN32
        unsigned long wRLen, b = WriteFile(comHandle, pData, Size, &wRLen, NULL);
        return (b && wRLen > 0) ? HAL_OK : 0;
    #else
        int len = write(comfd, pData, Size);
        return (len > 0) ? HAL_OK : 0;
    #endif
}

void writeFRAM(uint16_t address, uint8_t* buf, uint16_t len){memcpy(FRAM + address, buf, len);}
void readFRAM(uint16_t address, uint8_t* buf, uint16_t len){memcpy(buf, FRAM + address, len);}
void cleanFRAM(uint16_t address, uint16_t len){memset(FRAM + address, 0, len);}
void saveFRAM(int sign){
    puts("Saving FRAM in FRAM.bin ...");
    FILE* framfd = fopen("FRAM.bin", "w");
    if(framfd != NULL){
        fwrite(FRAM, 1024, 8, framfd);
        fclose(framfd);
    }
}

int main(int argc, char** argv){
    if(argc == 1){
        puts("No serial port inputed.");
        return 0;
    }
    FILE* framfd = fopen("FRAM.bin", "r");
    if(framfd != NULL){
        fread(FRAM, 1024, 8, framfd);
        fclose(framfd);
    }
    signal(SIGINT, saveFRAM);
    #ifdef _WIN32
        DCB dcb; WCHAR buf[100];
        swprintf((wchar_t*)buf, L"%s", argv[1]);
        comHandle = CreateFile(buf, GENERIC_READ | GENERIC_WRITE, 0, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
        if(INVALID_HANDLE_VALUE == comHandle){
            printf("Error serial port %s!", argv[1]);
            return 0;
        }
        SetupComm(comHandle, 1024, 1024);
        COMMTIMEOUTS CommTimeouts;
        CommTimeouts.ReadIntervalTimeout = MAXDWORD;
        CommTimeouts.ReadTotalTimeoutMultiplier = 0;
        CommTimeouts.ReadTotalTimeoutConstant = 0;
        CommTimeouts.WriteTotalTimeoutMultiplier = 1;
        CommTimeouts.WriteTotalTimeoutConstant = 1;
        SetCommTimeouts(comHandle, &CommTimeouts);
        GetCommState(comHandle, &dcb);
        dcb.BaudRate = 115200;
        dcb.ByteSize = 8;
        dcb.Parity   = NOPARITY;
        dcb.StopBits = ONESTOPBIT;
        SetCommState(comHandle, &dcb);
    #else
        comfd = open(argv[1], O_RDWR | O_NOCTTY);
        if(comfd < 0){
            printf("Error serial port %s!", argv[1]);
            return 0;
        }
        struct termios opt;
        cfsetispeed(&opt, B115200);
	    cfsetospeed(&opt, B115200);
        tcflush(comfd, TCIFLUSH);
        tcsetattr(comfd, TCSANOW, &opt);
    #endif
    UserMain();
    return 0;
}