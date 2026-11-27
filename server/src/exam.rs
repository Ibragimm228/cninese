use crate::{bad, now_ms, user_of, ApiError, Db};
use axum::{extract::State, http::HeaderMap, Json};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

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
    )
}

pub(super) async fn record(State(db): State<Db>, headers: HeaderMap, Json(input): Json<ResultInput>) -> Result<Json<ExamResult>, ApiError> {
    let db = db.lock().unwrap();
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
    db.execute("INSERT INTO exam_results (user_id, level, score, completed_at) VALUES (?1, ?2, ?3, ?4)",
        params![user, input.level, input.score, completed_at])?;
    Ok(Json(ExamResult { id: db.last_insert_rowid(), level: input.level, score: input.score, completed_at }))
}

pub(super) async fn history(State(db): State<Db>, headers: HeaderMap) -> Result<Json<Vec<ExamResult>>, ApiError> {
    let db = db.lock().unwrap();
    let user = user_of(&db, &headers)?;
    let mut stmt = db.prepare("SELECT id, level, score, completed_at FROM exam_results WHERE user_id = ?1 ORDER BY id DESC LIMIT 100")?;
    let rows = stmt.query_map([user], |r| Ok(ExamResult { id: r.get(0)?, level: r.get(1)?, score: r.get(2)?, completed_at: r.get(3)? }))?;
    Ok(Json(rows.collect::<rusqlite::Result<_>>()?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{header, HeaderValue, StatusCode};
    use std::sync::{Arc, Mutex};

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
