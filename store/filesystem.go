package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/pixec/triangle"
)

type Filesystem struct {
	rootPath      string
	encryptionKey []byte
}

var _ Store = (*Filesystem)(nil)

func NewFilesystem(rootPath, encryptionKey string) (*Filesystem, error) {
	if err := os.MkdirAll(rootPath, 0o755); err != nil {
		return nil, err
	}

	key, err := parseEncryptionKey(encryptionKey)
	if err != nil {
		return nil, err
	}

	return &Filesystem{
		rootPath:      rootPath,
		encryptionKey: key,
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

	payload := b

	if len(f.encryptionKey) > 0 {
		var env cryptoEnvelope
		if err := json.Unmarshal(b, &env); err == nil && isEnvelope(env) {
			decrypted, err := decryptAESGCM(f.encryptionKey, env)
			if err != nil {
				return p, err
			}

			payload = decrypted
		}
	}

	if err := json.Unmarshal(payload, &p); err != nil {
		return p, err
	}

	if p.ExpiresAt != nil && time.Now().UTC().After(*p.ExpiresAt) {
		return p, ErrPasteExpired
	}

	return p, nil
}

func (f *Filesystem) InsertPaste(id, title, content, passphrase string, expiresAt *time.Time) (triangle.Paste, error) {
	p := triangle.Paste{
		ID:        id,
		Title:     title,
		Content:   content,
		CreatedAt: time.Now().UTC(),
		ExpiresAt: expiresAt,
	}

	if passphrase != "" {
		env, err := encryptWithPassphrase(passphrase, []byte(content))
		if err != nil {
			return p, err
		}

		envJSON, err := json.Marshal(env)
		if err != nil {
			return p, err
		}

		p.Content = string(envJSON)
		p.Salt = env.Salt
		p.Encrypted = true
	}

	b, err := json.Marshal(p)
	if err != nil {
		return p, err
	}

	payload := b
	if len(f.encryptionKey) > 0 {
		env, err := encryptAESGCM(f.encryptionKey, b)
		if err != nil {
			return p, err
		}

		payload, err = json.Marshal(env)
		if err != nil {
			return p, err
		}
	}

	return p, os.WriteFile(filepath.Join(f.rootPath, id+".json"), payload, 0o644)
}

func (f *Filesystem) DecryptPaste(id, passphrase string) (string, error) {
	p, err := f.Paste(id)
	if err != nil {
		return "", err
	}

	if !p.Encrypted {
		return p.Content, nil
	}

	var env cryptoEnvelope
	if err := json.Unmarshal([]byte(p.Content), &env); err != nil {
		return "", fmt.Errorf("triangle/store: malformed encrypted content: %w", err)
	}

	plaintext, err := decryptWithPassphrase(passphrase, env)
	if err != nil {
		return "", ErrWrongPassphrase
	}

	return string(plaintext), nil
}
