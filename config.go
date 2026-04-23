package triangle

import "github.com/BurntSushi/toml"

type Config struct {
	Http       HttpConfig       `toml:"http"`
	Filesystem FilesystemConfig `toml:"filesystem"`
	Paste      PasteConfig      `toml:"paste"`
}

type HttpConfig struct {
	Address           string `toml:"address"`
	PublicURL         string `toml:"public_url"`
	NetcatAddress     string `toml:"netcat_address"`
	NetcatReadTimeout string `toml:"netcat_read_timeout"`
}

type FilesystemConfig struct {
	RootPath      string `toml:"root_path"`
	EncryptionKey string `toml:"encryption_key"`
}

type PasteConfig struct {
	MinContentLength int `toml:"min_content_length"`
	MaxContentLength int `toml:"max_content_length"`
	MaxTitleLength   int `toml:"max_title_length"`
	IDLength         int `toml:"id_length"`
}

func ParseConfig(p string) (Config, error) {
	var cfg Config
	if _, err := toml.DecodeFile(p, &cfg); err != nil {
		return cfg, err
	}

	return cfg, nil
}
