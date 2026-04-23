package triangle

import "embed"

// EmbeddedUI contains the built frontend bundle.
// Run `bun --bun run build` inside `ui/` before building the Go binary.
//go:generate cd ui && bun --bun run build
//go:embed ui/dist
var EmbeddedUI embed.FS
