use crate::{bad, now_ms, user_of, ApiError, Db};
use axum::{extract::State, http::HeaderMap, Json};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

const HISTORY_LIMIT: i64 = 100;

#[derive(Deserialize)]
pub(super) struct ResultInput {
    level: i64,
    score: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ExamResult {
    id: i64,
    level: i64,
    score: i64,
    completed_at: i64,
}

pub(super) fn migrate(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch(
        "CREATE TABLE IF NOT EXISTS exam_results (
           id INTEGER PRIMARY KEY,
           user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
           level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 3),
           score INTEGER NOT NULL CHECK(score BETWEEN 0 AND CASE WHEN level = 3 THEN 300 ELSE 200 END),
           completed_at INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS exam_results_user ON exam_results(user_id, id DESC);",
    )?;
    db.execute(
        "DELETE FROM exam_results WHERE id IN (
           SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY id DESC) AS rank FROM exam_results)
           WHERE rank > ?1
         )",
        [HISTORY_LIMIT],
    )?;
    Ok(())
}

pub(super) async fn record(State(db): State<Db>, headers: HeaderMap, Json(input): Json<ResultInput>) -> Result<Json<ExamResult>, ApiError> {
    let mut db = db.lock().unwrap();
    let user = user_of(&db, &headers)?;
    let max = match input.level {
        1 | 2 => 200,
        3 => 300,
        _ => return Err(bad("level must be between 1 and 3")),
    };
    if !(0..=max).contains(&input.score) {
        return Err(bad(format!("score must be between 0 and {max}")));
    }
    let completed_at = now_ms();
    let tx = db.transaction()?;
    tx.execute("INSERT INTO exam_results (user_id, level, score, completed_at) VALUES (?1, ?2, ?3, ?4)",
        params![user, input.level, input.score, completed_at])?;
    let id = tx.last_insert_rowid();
    tx.execute(
        "DELETE FROM exam_results WHERE user_id = ?1 AND id < (
           SELECT id FROM exam_results WHERE user_id = ?1 ORDER BY id DESC LIMIT 1 OFFSET ?2
         )",
        params![user, HISTORY_LIMIT - 1],
    )?;
    tx.commit()?;
    Ok(Json(ExamResult { id, level: input.level, score: input.score, completed_at }))
}

pub(super) async fn history(State(db): State<Db>, headers: HeaderMap) -> Result<Json<Vec<ExamResult>>, ApiError> {
    let db = db.lock().unwrap();
    let user = user_of(&db, &headers)?;
    let mut stmt = db.prepare("SELECT id, level, score, completed_at FROM exam_results WHERE user_id = ?1 ORDER BY id DESC LIMIT ?2")?;
    let rows = stmt.query_map(params![user, HISTORY_LIMIT], |r| Ok(ExamResult { id: r.get(0)?, level: r.get(1)?, score: r.get(2)?, completed_at: r.get(3)? }))?;
    Ok(Json(rows.collect::<rusqlite::Result<_>>()?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{header, HeaderValue, StatusCode};
    use std::sync::{Arc, Mutex};

    #[tokio::test]
    async fn retains_only_latest_results_per_user() {
        let conn = Connection::open_in_memory().unwrap();
        crate::migrate(&conn).unwrap();
        migrate(&conn).unwrap();
        conn.execute("INSERT INTO users VALUES (1, 'one', '', 0), (2, 'two', '', 0)", []).unwrap();
        let token = crate::open_session(&conn, 1).unwrap();
        let mut headers = HeaderMap::new();
        headers.insert(header::AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {token}")).unwrap());
        conn.execute("INSERT INTO exam_results (user_id, level, score, completed_at) VALUES (2, 1, 10, 0)", []).unwrap();
        for score in 0..=HISTORY_LIMIT {
            conn.execute("INSERT INTO exam_results (user_id, level, score, completed_at) VALUES (1, 1, ?1, 0)", [score]).unwrap();
        }
        migrate(&conn).unwrap();
        let count = |db: &Connection, user| db.query_row("SELECT count(*) FROM exam_results WHERE user_id = ?1", [user], |r| r.get::<_, i64>(0)).unwrap();
        assert_eq!(count(&conn, 1), HISTORY_LIMIT);
        let db = Arc::new(Mutex::new(conn));
        let Ok(Json(saved)) = record(State(db.clone()), headers.clone(), Json(ResultInput { level: 1, score: 101 })).await else { panic!("save failed") };
        let Ok(Json(results)) = history(State(db.clone()), headers).await else { panic!("missing history") };
        assert_eq!(results.first().unwrap().id, saved.id);
        assert_eq!(results.last().unwrap().score, 2);
        let conn = db.lock().unwrap();
        assert_eq!(count(&conn, 1), HISTORY_LIMIT);
        assert_eq!(count(&conn, 2), 1);
    }

    #[tokio::test]
    async fn history_is_private_and_scores_are_validated() {
        let conn = Connection::open_in_memory().unwrap();
        crate::migrate(&conn).unwrap();
        migrate(&conn).unwrap();
        conn.execute("INSERT INTO users VALUES (1, 'one', '', 0), (2, 'two', '', 0)", []).unwrap();
        let headers = |id| {
            let token = crate::open_session(&conn, id).unwrap();
            let mut headers = HeaderMap::new();
            headers.insert(header::AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {token}")).unwrap());
            headers
        };
        let (one, two) = (headers(1), headers(2));
        let db = Arc::new(Mutex::new(conn));
        for (level, score) in [(0, 0), (4, 0), (1, 201), (2, -1), (3, 301)] {
            assert!(matches!(record(State(db.clone()), one.clone(), Json(ResultInput { level, score })).await, Err(ApiError(StatusCode::BAD_REQUEST, _))));
        }
        assert!(record(State(db.clone()), one.clone(), Json(ResultInput { level: 1, score: 120 })).await.is_ok());
        assert!(record(State(db.clone()), one.clone(), Json(ResultInput { level: 3, score: 300 })).await.is_ok());
        assert!(matches!(history(State(db.clone()), HeaderMap::new()).await, Err(ApiError(StatusCode::UNAUTHORIZED, _))));
        let Ok(Json(results)) = history(State(db.clone()), one).await else { panic!("missing history") };
        assert_eq!(results.iter().map(|r| r.score).collect::<Vec<_>>(), vec![300, 120]);
        let Ok(Json(results)) = history(State(db), two).await else { panic!("missing history") };
        assert!(results.is_empty());
    }
}
