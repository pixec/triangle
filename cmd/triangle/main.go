package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
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
	s, err := store.NewFilesystem(cfg.Filesystem.RootPath)
	if err != nil {
		l.Error("could not create store", slog.Any("error", err))
		os.Exit(1)
	}
	defer s.Close()

	ph := handler.NewPaste(l, s)

	r := chi.NewRouter()
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	r.Route("/api", func(r chi.Router) {
		r.Route("/paste", func(r chi.Router) {
			r.Get("/{paste}", ph.Paste)
			r.Post("/", ph.Insert)
		})
	})

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
