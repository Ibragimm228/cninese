FROM rust:1-slim AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=build /app/target/release/moli-server /usr/local/bin/moli-server
ENV DATABASE_PATH=/data/moli.db PORT=8787
VOLUME /data
EXPOSE 8787
CMD ["moli-server"]
