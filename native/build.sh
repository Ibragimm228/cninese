#!/bin/sh
# Builds public/wasm/pitch.wasm. Needs clang and lld with the wasm32 target (apt install clang lld).
set -e
cd "$(dirname "$0")/.."
mkdir -p public/wasm
clang++ --target=wasm32 -O3 -ffast-math -msimd128 -nostdlib -fno-exceptions -fno-rtti \
  -Wl,--no-entry -Wl,--strip-all -Wl,--initial-memory=131072 \
  -o public/wasm/pitch.wasm native/pitch.cpp
ls -l public/wasm/pitch.wasm
