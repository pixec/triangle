FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -v -trimpath -ldflags="-s -w"  -o triangle ./cmd/triangle

FROM gcr.io/distroless/static-debian12
COPY --from=builder /app/triangle /triangle
ENTRYPOINT ["/triangle"]
