package triangle

import "github.com/BurntSushi/toml"

type Config struct {
	Http       HttpConfig       `toml:"http"`
	Filesystem FilesystemConfig `toml:"filesystem"`
}

type HttpConfig struct {
	Address string `toml:"address"`
}

type FilesystemConfig struct {
	RootPath string `toml:"root_path"`
}

func ParseConfig(p string) (Config, error) {
	var cfg Config
	if _, err := toml.DecodeFile(p, &cfg); err != nil {
		return cfg, err
	}

	return cfg, nil
}
