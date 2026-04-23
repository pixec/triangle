package main

import (
	"encoding/json"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jaevor/go-nanoid"
	"github.com/pixec/triangle"
	"github.com/pixec/triangle/handler"
	"github.com/pixec/triangle/store"
)

func main() {
	l := slog.New(slog.NewTextHandler(os.Stdout, nil))

	l.Info("parsing configuration file")
	cfg, err := triangle.ParseConfig("config.toml")
	if err != nil {
		l.Error("could not parse configuration file", slog.Any("error", err))
		os.Exit(1)
	}

	l.Info("creating filesystem store")
	s, err := store.NewFilesystem(cfg.Filesystem.RootPath, cfg.Filesystem.EncryptionKey)
	if err != nil {
		l.Error("could not create store", slog.Any("error", err))
		os.Exit(1)
	}
	defer s.Close()

	ph := handler.NewPaste(
		l,
		s,
		cfg.Http.PublicURL,
		cfg.Paste.MinContentLength,
		cfg.Paste.MaxContentLength,
		cfg.Paste.MaxTitleLength,
		cfg.Paste.IDLength,
	)

	netcatReadTimeout := 15 * time.Second
	if strings.TrimSpace(cfg.Http.NetcatReadTimeout) != "" {
		d, err := time.ParseDuration(cfg.Http.NetcatReadTimeout)
		if err == nil && d > 0 {
			netcatReadTimeout = d
		}
	}

	if strings.TrimSpace(cfg.Http.NetcatAddress) != "" {
		go func() {
			if err := serveNetcat(l, cfg.Http.NetcatAddress, cfg.Http.PublicURL, ph.MaxContentLength(), cfg.Paste.IDLength, netcatReadTimeout, s); err != nil {
				l.Error("netcat listener stopped", slog.Any("error", err))
			}
		}()
	}

	clientFS, err := fs.Sub(triangle.EmbeddedUI, "ui/dist")
	if err != nil {
		l.Error("could not prepare embedded ui", slog.Any("error", err))
		os.Exit(1)
	}

	uiHandler, err := newSPAHandler(clientFS)
	if err != nil {
		l.Error("could not create ui handler", slog.Any("error", err))
		os.Exit(1)
	}

	r := chi.NewRouter()
	r.Post("/", ph.InsertRaw)
	r.Get("/config", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]int{
			"min_content_length": ph.MinContentLength(),
			"max_content_length": ph.MaxContentLength(),
		})
	})
	r.Route("/api", func(r chi.Router) {
		r.Get("/config", func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]int{
				"min_content_length": ph.MinContentLength(),
				"max_content_length": ph.MaxContentLength(),
			})
		})
		r.Route("/paste", func(r chi.Router) {
			r.Get("/{paste}", ph.Paste)
			r.Post("/", ph.Insert)
			r.Post("/{paste}/decrypt", ph.Decrypt)
		})
	})
	r.Get("/*", uiHandler.ServeHTTP)
	r.Head("/*", uiHandler.ServeHTTP)

	l.Info("listening and serving http")
	srv := &http.Server{
		Addr:    cfg.Http.Address,
		Handler: r,
	}
	if err := srv.ListenAndServe(); err != nil {
		l.Error("could not listen and serve http", slog.Any("error", err))
		os.Exit(1)
	}
}

func serveNetcat(logger *slog.Logger, addr, baseURL string, maxContentLength, idLength int, readTimeout time.Duration, s store.Store) error {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	defer ln.Close()

	logger.Info("netcat listener started", slog.String("address", addr))

	for {
		conn, err := ln.Accept()
		if err != nil {
			return err
		}

		go handleNetcatConn(logger, conn, baseURL, maxContentLength, idLength, readTimeout, s)
	}
}

func handleNetcatConn(logger *slog.Logger, conn net.Conn, baseURL string, maxContentLength, idLength int, readTimeout time.Duration, s store.Store) {
	defer conn.Close()

	_ = conn.SetReadDeadline(time.Now().Add(readTimeout))

	b, err := io.ReadAll(io.LimitReader(conn, int64(maxContentLength+1)))
	if err != nil {
		_, _ = conn.Write([]byte("error: failed to read input\n"))
		return
	}

	content := string(b)
	if len(content) == 0 || len(content) > maxContentLength {
		_, _ = conn.Write([]byte("error: invalid content length\n"))
		return
	}

	id, err := nanoid.Standard(idLength)
	if err != nil {
		logger.Error("could not generate paste id for netcat", slog.Any("error", err))
		_, _ = conn.Write([]byte("error: internal error\n"))
		return
	}

	p, err := s.InsertPaste(id(), "", content, "", nil)
	if err != nil {
		logger.Error("could not insert netcat paste", slog.Any("error", err))
		_, _ = conn.Write([]byte("error: internal error\n"))
		return
	}

	url := strings.TrimRight(strings.TrimSpace(baseURL), "/") + "/?paste=" + p.ID
	if strings.TrimSpace(baseURL) == "" {
		url = "/?paste=" + p.ID
	}

	_, _ = conn.Write([]byte(url + "\n"))
}
