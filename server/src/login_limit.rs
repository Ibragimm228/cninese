use crate::ApiError;
use axum::http::StatusCode;
use rusqlite::{params, Connection};

const WINDOW_MS: i64 = 15 * 60 * 1000;
type Key = (String, String);

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
