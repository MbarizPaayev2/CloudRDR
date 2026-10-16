# ==============================================================================
# CloudRDR Enterprise Go Agent — Multi-Stage Ultra-Lightweight Container (<15MB)
# ==============================================================================

# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy module definition and source code
COPY go.mod ./
COPY . .

# Static compilation with stripped symbols for minimal footprint
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o cloudrdr-agent .

# Final Lightweight Runtime Stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /opt/cloudrdr

# Copy compiled binary from builder
COPY --from=builder /app/cloudrdr-agent /usr/local/bin/cloudrdr-agent

# Set default environment variables
ENV CLOUDRDR_MANAGER_URL="http://manager:3000" \
    CLOUDRDR_WATCH_DIR="/data/protected" \
    CLOUDRDR_BUCKET="protected" \
    CLOUDRDR_ACCOUNT_ID="default-account" \
    CLOUDRDR_ENTROPY_THRESHOLD="7.2" \
    CLOUDRDR_HEARTBEAT_SEC="10" \
    CLOUDRDR_POLL_INTERVAL_SEC="3" \
    CLOUDRDR_SPOOL_DIR="/opt/cloudrdr/spool"

# Mount point for monitored directory and offline spool
VOLUME ["/data/protected", "/opt/cloudrdr/spool"]

ENTRYPOINT ["/usr/local/bin/cloudrdr-agent"]
