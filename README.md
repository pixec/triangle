# Triangle
Yet another Hastebin alternative... in Go. 

## CLI Ingest

You can create pastes directly from stdin:

```sh
<command> | nc etc.fstab.me 9999
<command> | curl --data-binary @- https://etc.fstab.me
```

Both return a paste URL.

## Encryption At Rest
Triangle can encrypt stored paste files using AES-256-GCM.

Add this to config.toml:

```toml
[filesystem]
root_path = "data"
encryption_key = "<base64 32-byte key>"
```

Generate a key with openssl:

```sh
openssl rand -base64 32
```

When encryption is enabled:
- New paste files are stored encrypted.
- Existing plaintext files are still readable.

## License
`triangle` is licensed under the [MIT License](./LICENSE).
