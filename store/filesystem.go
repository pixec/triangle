package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"

	"github.com/pixec/triangle"
)

type Filesystem struct {
	rootPath string
}

var _ Store = (*Filesystem)(nil)

func NewFilesystem(rootPath string) (*Filesystem, error) {
	if err := os.MkdirAll(rootPath, 0o644); err != nil {
		return nil, err
	}

	return &Filesystem{
		rootPath: rootPath,
	}, nil
}

func (f *Filesystem) Close() error {
	return nil
}

func (f *Filesystem) Paste(id string) (triangle.Paste, error) {
	var p triangle.Paste

	b, err := os.ReadFile(filepath.Join(f.rootPath, id+".json"))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return p, ErrPasteNotFound
		}

		return p, err
	}

	if err := json.Unmarshal(b, &p); err != nil {
		return p, err
	}

	return p, nil
}

func (f *Filesystem) InsertPaste(id, content string) (triangle.Paste, error) {
	p := triangle.Paste{
		ID:        id,
		Content:   content,
		CreatedAt: time.Now().UTC(),
	}

	b, err := json.Marshal(p)
	if err != nil {
		return p, err
	}

	return p, os.WriteFile(filepath.Join(f.rootPath, id+".json"), b, 0o644)
}
