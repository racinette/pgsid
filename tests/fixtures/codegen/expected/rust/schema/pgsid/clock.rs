//! PostgreSQL's times of day, with and without a UTC offset.

use std::error::Error;
use std::fmt;

use bytes::{Buf, BufMut, BytesMut};
use chrono::NaiveTime;
use postgres_types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

use super::temporal::{accepts_base, exact};

type BoxError = Box<dyn Error + Sync + Send>;

const DAY_MICROS: i64 = 86_400_000_000;
// The server keeps a time zone's offset within fifteen hours fifty-nine minutes and fifty-nine
// seconds of UTC.
const MAX_OFFSET: i32 = 15 * 3600 + 59 * 60 + 59;

/// A time of day, from midnight to 24:00:00, which the server allows.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Time(i64);

impl Time {
    /// A time from microseconds since midnight, up to and including 24:00:00.
    pub fn from_microseconds(microseconds: i64) -> Option<Self> {
        (0..=DAY_MICROS).contains(&microseconds).then_some(Self(microseconds))
    }
    pub fn microseconds(self) -> i64 {
        self.0
    }
    /// The chrono time, which has no 24:00:00.
    pub fn naive(self) -> Option<NaiveTime> {
        if self.0 == DAY_MICROS {
            return None;
        }
        NaiveTime::from_num_seconds_from_midnight_opt((self.0 / 1_000_000) as u32, ((self.0 % 1_000_000) * 1000) as u32)
    }
}
impl From<NaiveTime> for Time {
    fn from(time: NaiveTime) -> Self {
        let midnight = NaiveTime::MIN;
        Self(time.signed_duration_since(midnight).num_microseconds().unwrap_or(0))
    }
}
impl fmt::Display for Time {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (seconds, micros) = (self.0 / 1_000_000, self.0 % 1_000_000);
        write!(formatter, "{:02}:{:02}:{:02}", seconds / 3600, seconds / 60 % 60, seconds % 60)?;
        if micros != 0 {
            write!(formatter, "{}", format!(".{micros:06}").trim_end_matches('0'))?;
        }
        Ok(())
    }
}

/// A time of day with its offset east of UTC.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Timetz {
    time: Time,
    offset: i32,
}

impl Timetz {
    /// A time with an offset east of UTC in seconds, within the bounds the server keeps.
    pub fn new(time: Time, offset_seconds: i32) -> Option<Self> {
        (-MAX_OFFSET..=MAX_OFFSET).contains(&offset_seconds).then_some(Self { time, offset: offset_seconds })
    }
    pub fn time(self) -> Time {
        self.time
    }
    pub fn offset_seconds(self) -> i32 {
        self.offset
    }
}

impl<'a> FromSql<'a> for Time {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let value = exact(raw, 8)?.get_i64();
        Self::from_microseconds(value).ok_or_else(|| "time outside a day".into())
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIME)
    }
}
impl ToSql for Time {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i64(self.0);
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIME)
    }
    to_sql_checked!();
}

// The server sends the zone as seconds west of UTC, the negated offset.
impl<'a> FromSql<'a> for Timetz {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let mut raw = exact(raw, 12)?;
        let (micros, zone) = (raw.get_i64(), raw.get_i32());
        let time = Time::from_microseconds(micros).ok_or("time outside a day")?;
        Self::new(time, -zone).ok_or_else(|| "time zone offset out of range".into())
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMETZ)
    }
}
impl ToSql for Timetz {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i64(self.time.0);
        out.put_i32(-self.offset);
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMETZ)
    }
    to_sql_checked!();
}
