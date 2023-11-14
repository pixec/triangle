package store

import (
	"errors"

	"github.com/pixec/triangle"
)

type Store interface {
	Paste(id string) (triangle.Paste, error)
	InsertPaste(id, content string) (triangle.Paste, error)
	Close() error
}

var ErrPasteNotFound = errors.New("triangle/store: paste not found")
