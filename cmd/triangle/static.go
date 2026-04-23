package main

import (
	"io/fs"
	"net/http"
	"path"
	"strings"
)

type spaHandler struct {
	root       fs.FS
	fileServer http.Handler
	index      []byte
}

func newSPAHandler(root fs.FS) (http.Handler, error) {
	index, err := fs.ReadFile(root, "index.html")
	if err != nil {
		return nil, err
	}

	return &spaHandler{
		root:       root,
		fileServer: http.FileServer(http.FS(root)),
		index:      index,
	}, nil
}

func (h *spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	requestPath := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if requestPath == "." {
		requestPath = "index.html"
	}

	if fi, err := fs.Stat(h.root, requestPath); err == nil && !fi.IsDir() {
		h.fileServer.ServeHTTP(w, r)
		return
	}

	w.Header().Set("content-type", "text/html; charset=utf-8")
	_, _ = w.Write(h.index)
}
