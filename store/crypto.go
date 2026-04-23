package store

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"

	"golang.org/x/crypto/pbkdf2"
)

const (
	encryptionAlgorithmAESGCM = "aes-256-gcm"
	pbkdf2Iterations          = 200_000
	saltSize                  = 16
)

type cryptoEnvelope struct {
	Algorithm  string `json:"algorithm"`
	Nonce      string `json:"nonce"`
	Ciphertext string `json:"ciphertext"`
	Salt       string `json:"salt,omitempty"`
}

func parseEncryptionKey(key string) ([]byte, error) {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return nil, nil
	}

	decoded, err := base64.StdEncoding.DecodeString(trimmed)
	if err != nil {
		return nil, fmt.Errorf("triangle/store: invalid encryption key base64: %w", err)
	}

	if len(decoded) != 32 {
		return nil, fmt.Errorf("triangle/store: encryption key must decode to 32 bytes, got %d", len(decoded))
	}

	return decoded, nil
}

func isEnvelope(env cryptoEnvelope) bool {
	return strings.TrimSpace(env.Algorithm) != "" &&
		strings.TrimSpace(env.Nonce) != "" &&
		strings.TrimSpace(env.Ciphertext) != ""
}

func isPassphraseEnvelope(env cryptoEnvelope) bool {
	return isEnvelope(env) && strings.TrimSpace(env.Salt) != ""
}

func deriveKeyFromPassphrase(passphrase string, salt []byte) []byte {
	return pbkdf2.Key([]byte(passphrase), salt, pbkdf2Iterations, 32, sha256.New)
}

func encryptWithPassphrase(passphrase string, plaintext []byte) (cryptoEnvelope, error) {
	salt := make([]byte, saltSize)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return cryptoEnvelope{}, err
	}

	key := deriveKeyFromPassphrase(passphrase, salt)
	env, err := encryptAESGCM(key, plaintext)
	if err != nil {
		return env, err
	}

	env.Salt = base64.StdEncoding.EncodeToString(salt)
	return env, nil
}

func decryptWithPassphrase(passphrase string, env cryptoEnvelope) ([]byte, error) {
	salt, err := base64.StdEncoding.DecodeString(env.Salt)
	if err != nil {
		return nil, fmt.Errorf("triangle/store: invalid salt encoding: %w", err)
	}

	key := deriveKeyFromPassphrase(passphrase, salt)
	return decryptAESGCM(key, env)
}

func encryptAESGCM(key, plaintext []byte) (cryptoEnvelope, error) {
	var env cryptoEnvelope

	block, err := aes.NewCipher(key)
	if err != nil {
		return env, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return env, err
	}

	nonce := make([]byte, aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return env, err
	}

	ciphertext := aead.Seal(nil, nonce, plaintext, nil)

	env = cryptoEnvelope{
		Algorithm:  encryptionAlgorithmAESGCM,
		Nonce:      base64.StdEncoding.EncodeToString(nonce),
		Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
	}

	return env, nil
}

func decryptAESGCM(key []byte, env cryptoEnvelope) ([]byte, error) {
	if env.Algorithm != encryptionAlgorithmAESGCM {
		return nil, fmt.Errorf("triangle/store: unsupported encryption algorithm %q", env.Algorithm)
	}

	nonce, err := base64.StdEncoding.DecodeString(env.Nonce)
	if err != nil {
		return nil, fmt.Errorf("triangle/store: invalid nonce encoding: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(env.Ciphertext)
	if err != nil {
		return nil, fmt.Errorf("triangle/store: invalid ciphertext encoding: %w", err)
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	if len(nonce) != aead.NonceSize() {
		return nil, errors.New("triangle/store: nonce size mismatch")
	}

	plaintext, err := aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("triangle/store: decrypt failed: %w", err)
	}

	return plaintext, nil
}
