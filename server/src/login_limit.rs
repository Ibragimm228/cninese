use crate::{bad, ApiError};
use axum::http::{HeaderMap, StatusCode};
use rusqlite::{params, Connection};
use std::net::IpAddr;

const WINDOW_MS: i64 = 15 * 60 * 1000;
type Key = (String, String);

#[derive(Clone)]
pub struct TrustedProxies(pub Vec<IpAddr>);

impl TrustedProxies {
    pub fn client_ip(&self, peer: IpAddr, headers: &HeaderMap) -> Result<IpAddr, ApiError> {
        let peer = peer.to_canonical();
        if !self.0.contains(&peer) {
            return Ok(peer);
        }
        // A trusted proxy appends its peer. Ignore untrusted input to the left.
        let values: Vec<_> = headers.get_all("x-forwarded-for").iter().collect();
        for value in values.into_iter().rev() {
            let value = value.to_str().map_err(|_| bad("invalid X-Forwarded-For"))?;
            for hop in value.rsplit(',') {
                let ip: IpAddr = hop.trim().parse().map_err(|_| bad("invalid X-Forwarded-For"))?;
                let ip = ip.to_canonical();
                if !self.0.contains(&ip) {
                    return Ok(ip);
                }
            }
        }
        Err(bad("trusted proxy did not provide a client IP"))
    }
}

pub fn migrate(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS login_attempts (
           ip TEXT NOT NULL, name TEXT NOT NULL, attempted_at INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS login_attempts_expiry ON login_attempts(attempted_at);
         CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts(ip, name);",
    )
}

pub fn reserve(db: &Connection, key: &Key, now: i64) -> Result<(), ApiError> {
    // Reserve before verifying so concurrent requests cannot bypass the limit.
    let tx = db.unchecked_transaction()?;
    tx.execute("DELETE FROM login_attempts WHERE attempted_at <= ?1", [now - WINDOW_MS])?;
    let count: i64 = tx.query_row(
        "SELECT count(*) FROM login_attempts WHERE ip = ?1 AND name = ?2",
        params![key.0, key.1],
        |row| row.get(0),
    )?;
    if count >= 5 {
        tx.commit()?;
        return Err(ApiError(StatusCode::TOO_MANY_REQUESTS, "too many login attempts; try again later".into()));
    }
    tx.execute("INSERT INTO login_attempts VALUES (?1, ?2, ?3)", params![key.0, key.1, now])?;
    tx.commit()?;
    Ok(())
}

pub fn clear(db: &Connection, key: &Key) -> rusqlite::Result<()> {
    db.execute("DELETE FROM login_attempts WHERE ip = ?1 AND name = ?2", params![key.0, key.1])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_trusted_peers_can_forward_distinct_clients() {
        let proxy = "192.0.2.8".parse().unwrap();
        let client = "198.51.100.2".parse::<IpAddr>().unwrap();
        let other = "198.51.100.3".parse().unwrap();
        let trusted = TrustedProxies(vec![proxy, "192.0.2.9".parse().unwrap()]);
        let mut headers = HeaderMap::new();
        headers.append("x-forwarded-for", "203.0.113.4, 198.51.100.2".parse().unwrap());
        headers.append("x-forwarded-for", "192.0.2.9".parse().unwrap());
        assert!(matches!(TrustedProxies(vec![]).client_ip(proxy, &headers), Ok(ip) if ip == proxy));
        assert!(matches!(trusted.client_ip(other, &headers), Ok(ip) if ip == other));
        assert!(matches!(trusted.client_ip(proxy, &HeaderMap::new()), Err(ApiError(StatusCode::BAD_REQUEST, _))));
        let Ok(forwarded) = trusted.client_ip(proxy, &headers) else { panic!("expected a client") };
        assert_eq!(forwarded, client);
        let db = Connection::open_in_memory().unwrap();
        migrate(&db).unwrap();
        let key = |ip: IpAddr| (ip.to_string(), "student".to_owned());
        for _ in 0..5 {
            assert!(reserve(&db, &key(forwarded), 0).is_ok());
        }
        assert!(matches!(reserve(&db, &key(forwarded), 1), Err(ApiError(StatusCode::TOO_MANY_REQUESTS, _))));
        headers.insert("x-forwarded-for", "198.51.100.3".parse().unwrap());
        let Ok(forwarded_other) = trusted.client_ip(proxy, &headers) else { panic!("expected a client") };
        assert!(reserve(&db, &key(forwarded_other), 1).is_ok());
    }

    #[test]
    fn sixth_attempt_is_blocked_until_the_oldest_expires() {
        let db = Connection::open_in_memory().unwrap();
        migrate(&db).unwrap();
        let key = ("127.0.0.1".into(), "student".into());
        for time in 0..5 {
            assert!(reserve(&db, &key, time).is_ok());
        }
        assert!(matches!(reserve(&db, &key, WINDOW_MS - 1), Err(ApiError(StatusCode::TOO_MANY_REQUESTS, _))));
        assert!(reserve(&db, &("127.0.0.2".into(), key.1.clone()), 5).is_ok());
        assert!(reserve(&db, &(key.0.clone(), "other".into()), 5).is_ok());
        assert!(reserve(&db, &key, WINDOW_MS).is_ok());
        clear(&db, &key).unwrap();
        assert!(reserve(&db, &key, WINDOW_MS).is_ok());
    }
}
