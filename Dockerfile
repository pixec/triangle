FROM oven/bun:1 AS ui-builder
WORKDIR /app/ui

COPY ui/package.json ui/bun.lock ./
RUN bun install --frozen-lockfile

COPY ui/ ./
RUN bun --bun run build

FROM golang:1.25-alpine AS go-builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN rm -rf ui/dist
COPY --from=ui-builder /app/ui/dist ./ui/dist

RUN CGO_ENABLED=0 GOOS=linux go build -v -trimpath -ldflags='-s -w' -o triangle ./cmd/triangle

FROM gcr.io/distroless/static-debian12
WORKDIR /app

COPY --from=go-builder /app/triangle /triangle

EXPOSE 8000 9999
ENTRYPOINT ["/triangle"]
