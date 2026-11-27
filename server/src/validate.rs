//! The server never trusts a client's numbers: a snapshot is checked for shape and
//! plausibility before it is stored or counted towards the league.

use serde_json::Value;

pub const MAX_SNAPSHOT_BYTES: usize = 256 * 1024;
/// Most XP one day of honest study can bring.
const MAX_XP_PER_DAY: i64 = 2_000;

#[derive(Debug, PartialEq)]
pub struct Summary {
    pub xp: i64,
    pub streak: i64,
    pub week_xp: i64,
}

fn int(v: &Value, key: &str) -> Result<i64, String> {
    v.get(key).and_then(Value::as_i64).ok_or_else(|| format!("{key}: expected a whole number"))
}

fn is_day(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 10 && b[4] == b'-' && b[7] == b'-' && b.iter().enumerate().all(|(i, c)| i == 4 || i == 7 || c.is_ascii_digit())
}

fn is_word_key(id: &str) -> bool {
    id.strip_prefix("w-").is_some_and(|body| {
        let mut parts = body.split('-');
        let slug = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit());
        parts.next().is_some_and(slug) && parts.next().is_none_or(slug) && parts.next().is_none() && body.len() <= 80
    })
}

fn is_lesson_key(id: &str) -> bool {
    let (prefix, unit_max) = match id.strip_prefix("hsk") {
        Some(id) => match id.split_once('-') {
            Some(("1", rest)) => (rest, 3),
            Some(("2", rest)) => (rest, 10),
            Some(("3", rest)) => (rest, 15),
            _ => return false,
        },
        None => (id, 10),
    };
    let in_range = |s: &str, max| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit())
        && !s.starts_with('0') && s.parse::<u8>().is_ok_and(|n| n <= max);
    let Some((unit, lesson)) = prefix.strip_prefix('u').and_then(|s| s.split_once('-')) else { return false };
    in_range(unit, unit_max) && (matches!(lesson, "review" | "test")
        || lesson.strip_prefix('l').is_some_and(|n| in_range(n, 5)))
}

/// Checks a progress snapshot and reduces it to the figures the server itself relies on.
/// `week` is the list of day keys (YYYY-MM-DD) that make up the current league week.
pub fn check(state: &Value, week: &[String]) -> Result<Summary, String> {
    if !state.is_object() {
        return Err("state: expected an object".into());
    }
    let xp = int(state, "xp")?;
    let streak = int(state, "streak")?;
    let best = int(state, "bestStreak")?;
    if xp < 0 || streak < 0 || best < streak {
        return Err("xp and streak must be non-negative, and bestStreak at least streak".into());
    }
    let by_day = state.get("xpByDay").and_then(Value::as_object).ok_or("xpByDay: expected an object")?;
    let mut total = 0i64;
    let mut week_xp = 0i64;
    for (day, v) in by_day {
        let n = v.as_i64().ok_or("xpByDay: values must be whole numbers")?;
        if !is_day(day) || !(0..=MAX_XP_PER_DAY).contains(&n) {
            return Err(format!("xpByDay[{day}]: out of range"));
        }
        total += n;
        if week.contains(day) {
            week_xp += n;
        }
    }
    // XP is only ever earned on a day, so the total cannot exceed the daily log
    if xp > total {
        return Err("xp is larger than the sum of xpByDay".into());
    }
    if streak as usize > by_day.len() {
        return Err("streak is longer than the number of active days".into());
    }
    for key in ["words", "lessons", "achievements"] {
        if !state.get(key).is_some_and(Value::is_object) {
            return Err(format!("{key}: expected an object"));
        }
    }
    let words = state["words"].as_object().unwrap();
    let lessons = state["lessons"].as_object().unwrap();
    if words.len() > 650 || words.iter().any(|(id, value)| !is_word_key(id) || !value.is_object()) {
        return Err("words: invalid vocabulary progress".into());
    }
    if lessons.len() > 300 || lessons.iter().any(|(id, value)| !is_lesson_key(id) || !value.is_object()) {
        return Err("lessons: invalid lesson progress".into());
    }
    Ok(Summary { xp, streak, week_xp })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn week() -> Vec<String> {
        vec!["2026-11-23".into(), "2026-11-24".into()]
    }

    fn good() -> Value {
        json!({ "xp": 40, "streak": 2, "bestStreak": 3, "xpByDay": { "2026-11-20": 15, "2026-11-23": 10, "2026-11-24": 15 },
                "words": {}, "lessons": {}, "achievements": {} })
    }

    #[test]
    fn accepts_a_consistent_snapshot() {
        assert_eq!(check(&good(), &week()), Ok(Summary { xp: 40, streak: 2, week_xp: 25 }));
    }

    #[test]
    fn rejects_xp_that_was_never_earned() {
        let mut s = good();
        s["xp"] = json!(9000);
        assert!(check(&s, &week()).is_err());
    }

    #[test]
    fn rejects_impossible_days_and_streaks() {
        let mut s = good();
        s["xpByDay"]["2026-11-24"] = json!(50_000);
        assert!(check(&s, &week()).is_err());
        let mut s = good();
        s["streak"] = json!(30);
        s["bestStreak"] = json!(30);
        assert!(check(&s, &week()).is_err());
    }

    #[test]
    fn accepts_expanded_levels_alongside_legacy_progress() {
        let mut s = good();
        s["words"] = json!({ "w-g0w": { "correct": 1 }, "w-123-sense": { "correct": 2 } });
        s["lessons"] = json!({ "u1-l1": { "times": 2 }, "hsk1-u3-review": {}, "hsk2-u10-l4": {}, "hsk3-u15-test": {} });
        assert!(check(&s, &week()).is_ok());
        s["lessons"]["hsk4-u1-l1"] = json!({});
        assert!(check(&s, &week()).is_err());
        s["lessons"] = json!({});
        s["words"]["w-123-sense"] = json!(2);
        assert!(check(&s, &week()).is_err());
    }
}
