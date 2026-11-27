# moli-server

Rust (axum + SQLite) server for accounts, progress sync, mock exam history and the weekly league.

```sh
cargo test
DATABASE_PATH=./moli.db PORT=8787 cargo run --release
```

Or `docker build -t moli-server . && docker run -p 8787:8787 -v moli:/data moli-server`.

The site talks to it only when built with `VITE_API_URL=https://your-server` (no trailing slash);
without that variable the app keeps progress in the browser as before.

The C++ pitch tracker lives in `native/pitch.cpp`; `native/build.sh` rebuilds `public/wasm/pitch.wasm`.

`POST /api/exam` records a client-scored mock exam (`{"level":3,"score":180}`).
`GET /api/exam` returns the signed-in user's latest 100 results, newest first.
Both require a bearer token. Levels 1 and 2 accept 0–200; level 3 accepts 0–300.
Login limits attempts by client IP and username; a successful login clears that
pair's counter. By default the server uses the TCP peer IP and ignores
`X-Forwarded-For`. Behind a reverse proxy, set `TRUSTED_PROXY` to the proxy's
IP (or a comma-separated list of proxy IPs). Each trusted proxy must append its
peer IP to `X-Forwarded-For` or overwrite the header with the verified client IP.
The server reads the chain from right to left and uses the first untrusted IP.
