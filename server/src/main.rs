//! Mòlì sync server: accounts, progress, exam history and a real weekly league.

mod exam;
mod login_limit;
mod validate;

use std::{
    net::{IpAddr, SocketAddr},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{ConnectInfo, Query, State},
    http::{header, HeaderMap, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Extension, Json, Router,
};
use rand::RngCore;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use tower_http::{cors::{Any, CorsLayer}, limit::RequestBodyLimitLayer};

type Db = Arc<Mutex<Connection>>;

struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "error": self.1 }))).into_response()
    }
}

impl From<rusqlite::Error> for ApiError {
    fn from(e: rusqlite::Error) -> Self {
        eprintln!("database error: {e}");
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, "database error".into())
    }
}

fn bad(msg: impl Into<String>) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, msg.into())
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

fn migrate(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS users (
           id INTEGER PRIMARY KEY,
           name TEXT NOT NULL UNIQUE COLLATE NOCASE,
           password TEXT NOT NULL,
           created_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS sessions (
           token_hash TEXT PRIMARY KEY,
           user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           created_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS progress (
           user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
           state TEXT NOT NULL,
           xp INTEGER NOT NULL,
           streak INTEGER NOT NULL,
           updated_at INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS league (
           user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           week TEXT NOT NULL,
           xp INTEGER NOT NULL,
           PRIMARY KEY (user_id, week)
         );",
    )
}

fn hash_token(token: &str) -> String {
    Sha256::digest(token.as_bytes()).iter().map(|b| format!("{b:02x}")).collect()
}

/// Opens a session and returns its bearer token; only the token's hash is stored.
fn open_session(db: &Connection, user_id: i64) -> rusqlite::Result<String> {
    let mut raw = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut raw);
    let token: String = raw.iter().map(|b| format!("{b:02x}")).collect();
    db.execute("INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?1, ?2, ?3)", params![hash_token(&token), user_id, now_ms()])?;
    Ok(token)
}

fn user_of(db: &Connection, headers: &HeaderMap) -> Result<i64, ApiError> {
    let token = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(ApiError(StatusCode::UNAUTHORIZED, "sign in first".into()))?;
    db.query_row("SELECT user_id FROM sessions WHERE token_hash = ?1", [hash_token(token)], |r| r.get(0))
        .optional()?
        .ok_or(ApiError(StatusCode::UNAUTHORIZED, "session expired".into()))
}

#[derive(Deserialize)]
struct Credentials {
    name: String,
    password: String,
}

#[derive(Serialize)]
struct Session {
    token: String,
    name: String,
}

async fn register(State(db): State<Db>, Json(c): Json<Credentials>) -> Result<Json<Session>, ApiError> {
    let name = c.name.trim().to_string();
    if !(2..=24).contains(&name.chars().count()) {
        return Err(bad("name must be 2 to 24 characters"));
    }
    if !(6..=128).contains(&c.password.len()) {
        return Err(bad("password must be 6 to 128 characters"));
    }
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default().hash_password(c.password.as_bytes(), &salt).map_err(|_| bad("could not hash password"))?.to_string();
    let db = db.lock().unwrap();
    match db.execute("INSERT INTO users (name, password, created_at) VALUES (?1, ?2, ?3)", params![name, hash, now_ms()]) {
        Ok(_) => {}
        Err(rusqlite::Error::SqliteFailure(e, _)) if e.code == rusqlite::ErrorCode::ConstraintViolation => {
            return Err(ApiError(StatusCode::CONFLICT, "this name is taken".into()))
        }
        Err(e) => return Err(e.into()),
    }
    let token = open_session(&db, db.last_insert_rowid())?;
    Ok(Json(Session { token, name }))
}

async fn login(State(db): State<Db>, ConnectInfo(peer): ConnectInfo<SocketAddr>, Extension(proxies): Extension<login_limit::TrustedProxies>, headers: HeaderMap, Json(c): Json<Credentials>) -> Result<Json<Session>, ApiError> {
    let name = c.name.trim();
    if !(2..=24).contains(&name.chars().count()) {
        return Err(ApiError(StatusCode::UNAUTHORIZED, "wrong name or password".into()));
    }
    let key = (proxies.client_ip(peer.ip(), &headers)?.to_string(), name.to_ascii_lowercase());
    let now = now_ms();
    // the lock is released before the slow password check so it cannot stall other requests
    let row: Option<(i64, String, String)> = {
        let db = db.lock().unwrap();
        login_limit::reserve(&db, &key, now)?;
        db.query_row("SELECT id, name, password FROM users WHERE name = ?1", [name], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).optional()?
    };
    if let Some((id, name, hash)) = row {
        if !(6..=128).contains(&c.password.len()) {
            return Err(ApiError(StatusCode::UNAUTHORIZED, "wrong name or password".into()));
        }
        let authenticated = tokio::task::spawn_blocking(move || {
            PasswordHash::new(&hash).is_ok_and(|parsed| Argon2::default().verify_password(c.password.as_bytes(), &parsed).is_ok())
        }).await.unwrap_or(false);
        if authenticated {
            let db = db.lock().unwrap();
            login_limit::clear(&db, &key)?;
            let token = open_session(&db, id)?;
            return Ok(Json(Session { token, name }));
        }
    }
    Err(ApiError(StatusCode::UNAUTHORIZED, "wrong name or password".into()))
}

async fn logout(State(db): State<Db>, headers: HeaderMap) -> Result<StatusCode, ApiError> {
    let db = db.lock().unwrap();
    user_of(&db, &headers)?;
    if let Some(token) = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")) {
        db.execute("DELETE FROM sessions WHERE token_hash = ?1", [hash_token(token)])?;
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn get_progress(State(db): State<Db>, headers: HeaderMap) -> Result<Json<Value>, ApiError> {
    let db = db.lock().unwrap();
    let user = user_of(&db, &headers)?;
    let row: Option<(String, i64)> =
        db.query_row("SELECT state, updated_at FROM progress WHERE user_id = ?1", [user], |r| Ok((r.get(0)?, r.get(1)?))).optional()?;
    Ok(Json(match row {
        Some((state, updated_at)) => json!({ "state": serde_json::from_str::<Value>(&state).unwrap_or(Value::Null), "updatedAt": updated_at }),
        None => json!({ "state": null, "updatedAt": 0 }),
    }))
}

#[derive(Deserialize)]
struct Snapshot {
    state: Value,
    /// day keys of the client's current week, Monday first
    week: Vec<String>,
    /// `updatedAt` of the copy this device last saw; 0 when it has seen none
    #[serde(default)]
    base: i64,
}

async fn put_progress(State(db): State<Db>, headers: HeaderMap, Json(s): Json<Snapshot>) -> Result<Json<Value>, ApiError> {
    if s.week.len() != 7 {
        return Err(bad("week: expected seven day keys"));
    }
    let summary = validate::check(&s.state, &s.week).map_err(bad)?;
    let text = s.state.to_string();
    if text.len() > validate::MAX_SNAPSHOT_BYTES {
        return Err(ApiError(StatusCode::PAYLOAD_TOO_LARGE, "snapshot is too large".into()));
    }
    let now = now_ms();
    let mut db = db.lock().unwrap();
    let user = user_of(&db, &headers)?;
    let tx = db.transaction()?;
    let stored: Option<i64> = tx.query_row("SELECT updated_at FROM progress WHERE user_id = ?1", [user], |r| r.get(0)).optional()?;
    if stored.is_some_and(|at| at != s.base) {
        return Err(ApiError(StatusCode::CONFLICT, "progress changed on another device".into()));
    }
    tx.execute(
        "INSERT INTO progress (user_id, state, xp, streak, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET state = ?2, xp = ?3, streak = ?4, updated_at = ?5",
        params![user, text, summary.xp, summary.streak, now],
    )?;
    tx.execute(
        "INSERT INTO league (user_id, week, xp) VALUES (?1, ?2, ?3) ON CONFLICT(user_id, week) DO UPDATE SET xp = ?3",
        params![user, s.week[0], summary.week_xp],
    )?;
    tx.commit()?;
    Ok(Json(json!({ "updatedAt": now })))
}

#[derive(Deserialize)]
struct LeagueQuery {
    week: String,
}

async fn league(State(db): State<Db>, headers: HeaderMap, Query(q): Query<LeagueQuery>) -> Result<Json<Value>, ApiError> {
    let db = db.lock().unwrap();
    let me = user_of(&db, &headers).ok();
    let mut stmt = db.prepare(
        "SELECT u.id, u.name, l.xp FROM league l JOIN users u ON u.id = l.user_id WHERE l.week = ?1 ORDER BY l.xp DESC, u.id LIMIT 50",
    )?;
    let rows = stmt
        .query_map([q.week], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, i64>(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(Json(json!(rows.iter().map(|(id, name, xp)| json!({ "name": name, "xp": xp, "me": Some(*id) == me })).collect::<Vec<_>>())))
}

#[tokio::main]
async fn main() {
    let path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "moli.db".into());
    let conn = Connection::open(&path).expect("open database");
    migrate(&conn).expect("migrate database");
    exam::migrate(&conn).expect("migrate exam history");
    login_limit::migrate(&conn).expect("migrate login limits");
    let trusted_proxies = match std::env::var("TRUSTED_PROXY") {
        Ok(value) if !value.trim().is_empty() => value.split(',')
            .map(|ip| ip.trim().parse::<IpAddr>().map(|ip| ip.to_canonical()))
            .collect::<Result<Vec<_>, _>>().expect("TRUSTED_PROXY must list IP addresses"),
        Ok(_) | Err(std::env::VarError::NotPresent) => Vec::new(),
        Err(e) => panic!("invalid TRUSTED_PROXY: {e}"),
    };
    let app = Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/api/register", post(register))
        .route("/api/login", post(login))
        .route("/api/logout", post(logout))
        .route("/api/progress", get(get_progress).put(put_progress))
        .route("/api/league", get(league))
        .route("/api/exam", get(exam::history).post(exam::record))
        .layer(Extension(login_limit::TrustedProxies(trusted_proxies)))
        .layer(RequestBodyLimitLayer::new(validate::MAX_SNAPSHOT_BYTES + 4096))
        .layer(CorsLayer::new().allow_origin(Any).allow_methods([Method::GET, Method::POST, Method::PUT]).allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE]))
        .with_state(Arc::new(Mutex::new(conn)));
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8787);
    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await.expect("bind port");
    println!("moli-server listening on :{port}, database {path}");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).with_graceful_shutdown(async { let _ = tokio::signal::ctrl_c().await; }).await.expect("serve");
}
