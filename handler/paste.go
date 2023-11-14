package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jaevor/go-nanoid"
	"github.com/pixec/triangle/store"
)

type Paste struct {
	logger *slog.Logger
	store  store.Store
}

func NewPaste(l *slog.Logger, s store.Store) *Paste {
	return &Paste{
		logger: l,
		store:  s,
	}
}

func (h *Paste) Paste(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "paste")
	if id == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	p, err := h.store.Paste(id)
	if err != nil {
		if errors.Is(err, store.ErrPasteNotFound) {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		h.logger.Error("could not fetch paste from store", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(p)
}

func (h *Paste) Insert(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if len(data.Content) < 8 || len(data.Content) > 1000 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id, err := nanoid.Standard(14)
	if err != nil {
		h.logger.Error("could not generate paste identifier", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	p, err := h.store.InsertPaste(id(), data.Content)
	if err != nil {
		h.logger.Error("could not insert paste to store", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(p)
}
