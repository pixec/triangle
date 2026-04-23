package store

import (
	"errors"
	"time"

	"github.com/pixec/triangle"
)

type Store interface {
	Paste(id string) (triangle.Paste, error)
	InsertPaste(id, title, content, passphrase string, expiresAt *time.Time) (triangle.Paste, error)
	DecryptPaste(id, passphrase string) (string, error)
	Close() error
}

var ErrPasteNotFound = errors.New("triangle/store: paste not found")
var ErrWrongPassphrase = errors.New("triangle/store: wrong passphrase")
var ErrPasteExpired = errors.New("triangle/store: paste expired")
