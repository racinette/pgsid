//! PostgreSQL's dates, timestamps and intervals, each finite or one of its two infinities.

use std::error::Error;

use bytes::{Buf, BufMut, BytesMut};
use chrono::{DateTime, Duration, NaiveDate, NaiveDateTime, Utc};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};

type BoxError = Box<dyn Error + Sync + Send>;

// The server counts from 2000-01-01; chrono from 1970-01-01.
const EPOCH_MICROS: i64 = 946_684_800_000_000;
const EPOCH_DAYS: i32 = 10_957;

// A type the value is, or a domain over one.
pub(crate) fn accepts_base(ty: &Type, expected: &Type) -> bool {
    match ty.kind() {
        Kind::Domain(base) => accepts_base(base, expected),
        _ => ty == expected,
    }
}

pub(crate) fn exact(raw: &[u8], width: usize) -> Result<&[u8], BoxError> {
    if raw.len() != width {
        return Err(format!("invalid {width}-byte value of {} bytes", raw.len()).into());
    }
    Ok(raw)
}

/// A timestamp with time zone: an instant, or one of the two infinities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Timestamptz {
    NegInfinity,
    Finite(DateTime<Utc>),
    Infinity,
}

/// A timestamp without time zone: a wall-clock reading, or one of the two infinities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Timestamp {
    NegInfinity,
    Finite(NaiveDateTime),
    Infinity,
}

/// A date: a calendar day, or one of the two infinities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum Date {
    NegInfinity,
    Finite(NaiveDate),
    Infinity,
}

/// An interval: months, days and microseconds kept apart, as the server keeps them, since a month
/// has no fixed number of days and a day no fixed number of microseconds; or one of the two
/// infinities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Interval {
    NegInfinity,
    Finite { months: i32, days: i32, microseconds: i64 },
    Infinity,
}

fn micros(raw: &[u8]) -> Result<i64, BoxError> {
    Ok(exact(raw, 8)?.get_i64())
}
fn instant(value: i64) -> Result<DateTime<Utc>, BoxError> {
    value
        .checked_add(EPOCH_MICROS)
        .and_then(DateTime::from_timestamp_micros)
        .ok_or_else(|| "timestamp outside the range chrono represents".into())
}
fn since_epoch(value: DateTime<Utc>) -> Result<i64, BoxError> {
    value
        .timestamp_micros()
        .checked_sub(EPOCH_MICROS)
        .filter(|value| *value != i64::MIN && *value != i64::MAX)
        .ok_or_else(|| "timestamp outside the range the server represents".into())
}

impl<'a> FromSql<'a> for Timestamptz {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(match micros(raw)? {
            i64::MAX => Self::Infinity,
            i64::MIN => Self::NegInfinity,
            value => Self::Finite(instant(value)?),
        })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMESTAMPTZ)
    }
}
impl ToSql for Timestamptz {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i64(match self {
            Self::Infinity => i64::MAX,
            Self::NegInfinity => i64::MIN,
            Self::Finite(value) => since_epoch(*value)?,
        });
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMESTAMPTZ)
    }
    to_sql_checked!();
}

impl<'a> FromSql<'a> for Timestamp {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(match micros(raw)? {
            i64::MAX => Self::Infinity,
            i64::MIN => Self::NegInfinity,
            value => Self::Finite(instant(value)?.naive_utc()),
        })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMESTAMP)
    }
}
impl ToSql for Timestamp {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i64(match self {
            Self::Infinity => i64::MAX,
            Self::NegInfinity => i64::MIN,
            Self::Finite(value) => since_epoch(value.and_utc())?,
        });
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::TIMESTAMP)
    }
    to_sql_checked!();
}

impl<'a> FromSql<'a> for Date {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(match exact(raw, 4)?.get_i32() {
            i32::MAX => Self::Infinity,
            i32::MIN => Self::NegInfinity,
            days => Self::Finite(
                NaiveDate::from_ymd_opt(2000, 1, 1)
                    .and_then(|epoch| epoch.checked_add_signed(Duration::days(days.into())))
                    .ok_or("date outside the range chrono represents")?,
            ),
        })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::DATE)
    }
}
impl ToSql for Date {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i32(match self {
            Self::Infinity => i32::MAX,
            Self::NegInfinity => i32::MIN,
            Self::Finite(value) => {
                let days = value.signed_duration_since(NaiveDate::from_ymd_opt(1970, 1, 1).unwrap()).num_days();
                i32::try_from(days)
                    .ok()
                    .and_then(|days| days.checked_sub(EPOCH_DAYS))
                    .filter(|days| *days != i32::MIN && *days != i32::MAX)
                    .ok_or("date outside the range the server represents")?
            }
        });
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::DATE)
    }
    to_sql_checked!();
}

impl<'a> FromSql<'a> for Interval {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let mut raw = exact(raw, 16)?;
        let (microseconds, days, months) = (raw.get_i64(), raw.get_i32(), raw.get_i32());
        Ok(match (months, days, microseconds) {
            (i32::MAX, i32::MAX, i64::MAX) => Self::Infinity,
            (i32::MIN, i32::MIN, i64::MIN) => Self::NegInfinity,
            _ => Self::Finite { months, days, microseconds },
        })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::INTERVAL)
    }
}
impl ToSql for Interval {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        let (months, days, microseconds) = match *self {
            Self::Infinity => (i32::MAX, i32::MAX, i64::MAX),
            Self::NegInfinity => (i32::MIN, i32::MIN, i64::MIN),
            // The server keeps an infinite interval as every field at its extreme, so a finite
            // interval of that encoding is refused rather than read back as infinity.
            Self::Finite { months, days, microseconds }
                if (months, days, microseconds) == (i32::MAX, i32::MAX, i64::MAX)
                    || (months, days, microseconds) == (i32::MIN, i32::MIN, i64::MIN) =>
            {
                return Err("finite interval with the encoding of an infinity".into())
            }
            Self::Finite { months, days, microseconds } => (months, days, microseconds),
        };
        out.put_i64(microseconds);
        out.put_i32(days);
        out.put_i32(months);
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::INTERVAL)
    }
    to_sql_checked!();
}
