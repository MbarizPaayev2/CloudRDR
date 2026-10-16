# CloudRDR C Agent & Low-Level Engines Makefile
CC ?= gcc
CFLAGS ?= -O3 -Wall -Wextra -std=c11 -Iinclude

ifeq ($(OS),Windows_NT)
    LIBS = -lws2_32 -lm
    EXT = .exe
else
    LIBS = -lm
    EXT =
endif

BIN_DIR = bin
SRC_DIR = src

SRCS_CORE = $(SRC_DIR)/cloudrdr_sha256.c \
            $(SRC_DIR)/cloudrdr_entropy.c \
            $(SRC_DIR)/cloudrdr_canary.c \
            $(SRC_DIR)/cloudrdr_detector.c \
            $(SRC_DIR)/cloudrdr_merkle.c

all: dirs $(BIN_DIR)/cloudrdr-agent$(EXT) $(BIN_DIR)/cloudrdr-entropy$(EXT) $(BIN_DIR)/cloudrdr-merkle$(EXT)

dirs:
	mkdir -p $(BIN_DIR)

$(BIN_DIR)/cloudrdr-agent$(EXT): $(SRC_DIR)/agent.c $(SRCS_CORE)
	$(CC) $(CFLAGS) -o $@ $^ $(LIBS)

$(BIN_DIR)/cloudrdr-entropy$(EXT): $(SRC_DIR)/cli_entropy.c $(SRC_DIR)/cloudrdr_entropy.c
	$(CC) $(CFLAGS) -o $@ $^ $(LIBS)

$(BIN_DIR)/cloudrdr-merkle$(EXT): $(SRC_DIR)/cli_merkle.c $(SRC_DIR)/cloudrdr_merkle.c $(SRC_DIR)/cloudrdr_sha256.c
	$(CC) $(CFLAGS) -o $@ $^ $(LIBS)

clean:
	rm -f $(BIN_DIR)/cloudrdr-agent $(BIN_DIR)/cloudrdr-entropy $(BIN_DIR)/cloudrdr-merkle
