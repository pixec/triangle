package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jaevor/go-nanoid"
	"github.com/pixec/triangle/store"
)

type Paste struct {
	logger           *slog.Logger
	store            store.Store
	publicURL        string
	minContentLength int
	maxContentLength int
	maxTitleLength   int
	idLength         int
}

func NewPaste(l *slog.Logger, s store.Store, publicURL string, minContentLength, maxContentLength, maxTitleLength, idLength int) *Paste {
	if minContentLength <= 0 {
		minContentLength = 8
	}
	if maxContentLength <= 0 {
		maxContentLength = 1000
	}
	if maxTitleLength <= 0 {
		maxTitleLength = 100
	}
	if idLength <= 0 {
		idLength = 14
	}

	return &Paste{
		logger:           l,
		store:            s,
		publicURL:        publicURL,
		minContentLength: minContentLength,
		maxContentLength: maxContentLength,
		maxTitleLength:   maxTitleLength,
		idLength:         idLength,
	}
}

func (h *Paste) MinContentLength() int {
	return h.minContentLength
}

func (h *Paste) MaxContentLength() int {
	return h.maxContentLength
}

func (h *Paste) Paste(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "paste")
	if id == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	p, err := h.store.Paste(id)
	if err != nil {
		if errors.Is(err, store.ErrPasteNotFound) || errors.Is(err, store.ErrPasteExpired) {
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
		Title      string `json:"title"`
		Content    string `json:"content"`
		Passphrase string `json:"passphrase"`
		ExpiresIn  string `json:"expires_in"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if len(data.Content) < h.minContentLength || len(data.Content) > h.maxContentLength {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if len(data.Title) > h.maxTitleLength {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	var expiresAt *time.Time
	if data.ExpiresIn != "" {
		d, err := time.ParseDuration(data.ExpiresIn)
		if err != nil || d <= 0 {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		t := time.Now().UTC().Add(d)
		expiresAt = &t
	}

	id, err := nanoid.Standard(h.idLength)
	if err != nil {
		h.logger.Error("could not generate paste identifier", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	p, err := h.store.InsertPaste(id(), data.Title, data.Content, data.Passphrase, expiresAt)
	if err != nil {
		h.logger.Error("could not insert paste to store", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(p)
}

func (h *Paste) Decrypt(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "paste")
	if id == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	var data struct {
		Passphrase string `json:"passphrase"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil || data.Passphrase == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	content, err := h.store.DecryptPaste(id, data.Passphrase)
	if err != nil {
		if errors.Is(err, store.ErrPasteNotFound) || errors.Is(err, store.ErrPasteExpired) {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		if errors.Is(err, store.ErrWrongPassphrase) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		h.logger.Error("could not decrypt paste", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"content": content})
}

func (h *Paste) InsertRaw(w http.ResponseWriter, r *http.Request) {
	b, err := io.ReadAll(io.LimitReader(r.Body, int64(h.maxContentLength+1)))
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if len(b) == 0 || len(b) > h.maxContentLength {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	id, err := nanoid.Standard(h.idLength)
	if err != nil {
		h.logger.Error("could not generate paste identifier", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	p, err := h.store.InsertPaste(id(), "", string(b), "", nil)
	if err != nil {
		h.logger.Error("could not insert raw paste to store", slog.Any("error", err))
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("content-type", "text/plain; charset=utf-8")
	baseURL := h.publicURL
	if strings.TrimSpace(baseURL) == "" {
		baseURL = requestBaseURL(r)
	}
	_, _ = fmt.Fprintln(w, buildPasteURL(baseURL, p.ID))
}

func buildPasteURL(baseURL, id string) string {
	trimmed := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if trimmed == "" {
		return "/?paste=" + id
	}

	return trimmed + "/?paste=" + id
}

func requestBaseURL(r *http.Request) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwarded != "" {
		scheme = forwarded
	}

	host := strings.TrimSpace(r.Host)
	if host == "" {
		return ""
	}

	return scheme + "://" + host
}
