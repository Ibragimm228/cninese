# moli-server

Rust (axum + SQLite) server for accounts, progress sync and the weekly league.

```sh
cargo test
DATABASE_PATH=./moli.db PORT=8787 cargo run --release
```

Or `docker build -t moli-server . && docker run -p 8787:8787 -v moli:/data moli-server`.

The site talks to it only when built with `VITE_API_URL=https://your-server` (no trailing slash);
without that variable the app keeps progress in the browser as before.

The C++ pitch tracker lives in `native/pitch.cpp`; `native/build.sh` rebuilds `public/wasm/pitch.wasm`.
