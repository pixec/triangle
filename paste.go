package triangle

import (
	"time"
)

type Paste struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Content   string     `json:"content"`
	Encrypted bool       `json:"encrypted"`
	Salt      string     `json:"salt,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}
