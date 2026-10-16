BINARY_NAME=cloudrdr-agent
OUTPUT_DIR=bin

.PHONY: all build build-linux build-linux-arm build-windows clean run

all: build-linux build-windows

build:
	go build -ldflags="-s -w" -o $(OUTPUT_DIR)/$(BINARY_NAME) .

build-linux:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-amd64 .

build-linux-arm:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(OUTPUT_DIR)/$(BINARY_NAME)-linux-arm64 .

build-windows:
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o $(OUTPUT_DIR)/$(BINARY_NAME)-windows-amd64.exe .

clean:
	rm -rf $(OUTPUT_DIR)

run:
	go run .
