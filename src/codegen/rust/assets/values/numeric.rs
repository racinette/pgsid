//! PostgreSQL's numeric, with PostgreSQL's own arithmetic from the CHECK evaluator.

use std::cmp::Ordering;
use std::error::Error;
use std::fmt;
use std::str::FromStr;

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, ToSql, Type};

use super::evaluator::{checkruntime as runtime, pg_catalog as operations};
use super::temporal::accepts_base;

type BoxError = Box<dyn Error + Sync + Send>;

/// A PostgreSQL numeric: exact, keeping its scale, NaN and the infinities. A value is made from
/// text, read as numeric input reads it, or from an integer, and reads back as its exact text.
/// Equality and order are PostgreSQL's: 1.50 equals 1.5, and NaN equals itself and follows every
/// other value.
#[derive(Clone)]
pub struct Numeric {
    text: String,
}

/// The error PostgreSQL raises for a numeric operation, such as division by zero.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NumericError {
    pub code: String,
    pub message: String,
}

impl fmt::Display for NumericError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{} (SQLSTATE {})", self.message, self.code)
    }
}
impl Error for NumericError {}

fn result(value: runtime::NumericValue) -> Result<Numeric, NumericError> {
    match value {
        runtime::NumericValue::Value(text) => Ok(Numeric { text }),
        runtime::NumericValue::Error(error) => {
            let mut code = String::new();
            let mut state = error.state;
            for _ in 0..5 {
                let digit = state % 36;
                code.insert(0, std::char::from_digit(digit as u32, 36).unwrap().to_ascii_uppercase());
                state /= 36;
            }
            Err(NumericError { code, message: runtime::sql_error_message(error).message.to_owned() })
        }
        _ => Err(NumericError { code: "XX000".to_owned(), message: "the numeric operation has no result".to_owned() }),
    }
}
// An operation that cannot fail.
fn value(value: runtime::NumericValue) -> Numeric {
    result(value).expect("numeric operation")
}

impl Numeric {
    /// Reads text as numeric input does, so it accepts what the server accepts and keeps the scale
    /// written.
    pub fn parse(text: &str) -> Result<Self, NumericError> {
        result(operations::scalar_numeric_from_text(runtime::make_text_value(text)))
    }
    fn operand(&self) -> runtime::NumericValue {
        runtime::make_numeric_value(&self.text)
    }
    /// The nearest double, losing precision beyond it and the scale.
    pub fn to_f64(&self) -> f64 {
        match self.text.as_str() {
            "NaN" => f64::NAN,
            "Infinity" => f64::INFINITY,
            "-Infinity" => f64::NEG_INFINITY,
            text => text.parse().unwrap_or(f64::NAN),
        }
    }
    pub fn add(&self, other: &Self) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__numeric_add__o3d7(self.operand(), other.operand()))
    }
    pub fn sub(&self, other: &Self) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__numeric_sub__ys09(self.operand(), other.operand()))
    }
    pub fn mul(&self, other: &Self) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__numeric_mul__bj4l(self.operand(), other.operand()))
    }
    pub fn div(&self, other: &Self) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__numeric_div__pnzm(self.operand(), other.operand()))
    }
    pub fn rem(&self, other: &Self) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__numeric_mod__8ywz(self.operand(), other.operand()))
    }
    pub fn neg(&self) -> Self {
        value(operations::sql__pg_catalog__numeric_uminus__wcmy(self.operand()))
    }
    pub fn abs(&self) -> Self {
        value(operations::sql__pg_catalog__numeric_abs__6g5e(self.operand()))
    }
    /// Rounds to `scale` digits after the decimal point, before it where `scale` is negative.
    pub fn round(&self, scale: i32) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__round__otcq(self.operand(), runtime::make_int4_value(scale)))
    }
    /// Truncates to `scale` digits after the decimal point, before it where `scale` is negative.
    pub fn trunc(&self, scale: i32) -> Result<Self, NumericError> {
        result(operations::sql__pg_catalog__trunc__hay3(self.operand(), runtime::make_int4_value(scale)))
    }
    /// -1, 0 or 1, or NaN for NaN.
    pub fn sign(&self) -> Self {
        value(operations::sql__pg_catalog__sign__2rsu(self.operand()))
    }
    pub fn is_nan(&self) -> bool {
        self.text == "NaN"
    }
    pub fn is_infinite(&self) -> bool {
        self.text == "Infinity" || self.text == "-Infinity"
    }
}

impl Default for Numeric {
    fn default() -> Self {
        Self { text: "0".to_owned() }
    }
}
impl From<i64> for Numeric {
    fn from(value: i64) -> Self {
        Self { text: value.to_string() }
    }
}
impl From<i32> for Numeric {
    fn from(value: i32) -> Self {
        Self { text: value.to_string() }
    }
}
impl FromStr for Numeric {
    type Err = NumericError;
    fn from_str(text: &str) -> Result<Self, Self::Err> {
        Self::parse(text)
    }
}
impl fmt::Display for Numeric {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.text)
    }
}
impl fmt::Debug for Numeric {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.debug_tuple("Numeric").field(&self.text).finish()
    }
}
impl PartialEq for Numeric {
    fn eq(&self, other: &Self) -> bool {
        matches!(
            operations::sql__pg_catalog__numeric_eq__fw7r(self.operand(), other.operand()),
            runtime::BoolValue::Value(true)
        )
    }
}
impl PartialOrd for Numeric {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        match operations::sql__pg_catalog__numeric_cmp__6h4s(self.operand(), other.operand()) {
            runtime::Int4Value::Value(order) => Some(order.cmp(&0)),
            _ => None,
        }
    }
}

// The binary format: base-10000 digits after a count, the weight of the first, a sign word and
// the display scale.
const POSITIVE: u16 = 0x0000;
const NEGATIVE: u16 = 0x4000;
const NAN: u16 = 0xC000;
const INFINITY: u16 = 0xD000;
const NEGATIVE_INFINITY: u16 = 0xF000;

fn decode(mut raw: &[u8]) -> Result<String, BoxError> {
    if raw.len() < 8 {
        return Err("invalid numeric".into());
    }
    let (count, weight, sign, scale) = (raw.get_i16(), raw.get_i16(), raw.get_u16(), raw.get_u16());
    match sign {
        NAN => return Ok("NaN".to_owned()),
        INFINITY => return Ok("Infinity".to_owned()),
        NEGATIVE_INFINITY => return Ok("-Infinity".to_owned()),
        POSITIVE | NEGATIVE => {}
        _ => return Err("invalid numeric sign".into()),
    }
    let count = usize::try_from(count).map_err(|_| "invalid numeric")?;
    if raw.len() != count * 2 {
        return Err("invalid numeric".into());
    }
    let digits: Vec<i16> = (0..count).map(|_| raw.get_i16()).collect();
    let digit = |index: i32| usize::try_from(index).ok().and_then(|index| digits.get(index)).copied().unwrap_or(0);
    let mut text = String::new();
    if sign == NEGATIVE {
        text.push('-');
    }
    if weight < 0 {
        text.push('0');
    } else {
        for index in 0..=i32::from(weight) {
            if index == 0 {
                text.push_str(&digit(index).to_string());
            } else {
                text.push_str(&format!("{:04}", digit(index)));
            }
        }
    }
    let scale = usize::from(scale);
    if scale > 0 {
        let mut fraction = String::new();
        let mut index = i32::from(weight) + 1;
        while fraction.len() < scale {
            fraction.push_str(&format!("{:04}", digit(index)));
            index += 1;
        }
        fraction.truncate(scale);
        text.push('.');
        text.push_str(&fraction);
    }
    Ok(text)
}

fn encode(text: &str, out: &mut BytesMut) -> Result<(), BoxError> {
    let special = match text {
        "NaN" => Some(NAN),
        "Infinity" => Some(INFINITY),
        "-Infinity" => Some(NEGATIVE_INFINITY),
        _ => None,
    };
    if let Some(sign) = special {
        out.put_i16(0);
        out.put_i16(0);
        out.put_u16(sign);
        out.put_u16(0);
        return Ok(());
    }
    let (negative, unsigned) = match text.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, text),
    };
    let (integer, fraction) = unsigned.split_once('.').unwrap_or((unsigned, ""));
    if integer.is_empty() || !integer.bytes().chain(fraction.bytes()).all(|byte| byte.is_ascii_digit()) {
        return Err(format!("invalid numeric text {text:?}").into());
    }
    let scale = u16::try_from(fraction.len())?;
    // Groups of four decimal digits aligned on the decimal point.
    let lead = (4 - integer.len() % 4) % 4;
    let integer = format!("{}{}", "0".repeat(lead), integer);
    let trail = (4 - fraction.len() % 4) % 4;
    let fraction = format!("{}{}", fraction, "0".repeat(trail));
    let group = |chunk: &[u8]| -> i16 { std::str::from_utf8(chunk).unwrap().parse().unwrap() };
    let mut digits: Vec<i16> = integer.as_bytes().chunks(4).map(group).collect();
    let mut weight = i32::try_from(digits.len())? - 1;
    digits.extend(fraction.as_bytes().chunks(4).map(group));
    while digits.first() == Some(&0) {
        digits.remove(0);
        weight -= 1;
    }
    while digits.last() == Some(&0) {
        digits.pop();
    }
    let zero = digits.is_empty();
    out.put_i16(i16::try_from(digits.len())?);
    out.put_i16(if zero { 0 } else { i16::try_from(weight)? });
    out.put_u16(if negative && !zero { NEGATIVE } else { POSITIVE });
    out.put_u16(scale);
    for digit in digits {
        out.put_i16(digit);
    }
    Ok(())
}

impl<'a> FromSql<'a> for Numeric {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(Self { text: decode(raw)? })
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::NUMERIC)
    }
}
impl ToSql for Numeric {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        encode(&self.text, out)?;
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        accepts_base(ty, &Type::NUMERIC)
    }
    to_sql_checked!();
}

// JSON writes the exact text as a string, since a JSON number would round it, and reads a string
// or a number.
impl serde::Serialize for Numeric {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.text)
    }
}
impl<'de> serde::Deserialize<'de> for Numeric {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(serde::Deserialize)]
        #[serde(untagged)]
        enum Written {
            Text(String),
            Number(serde_json::Number),
        }
        let text = match Written::deserialize(deserializer)? {
            Written::Text(text) => text,
            Written::Number(number) => number.to_string(),
        };
        Numeric::parse(&text).map_err(serde::de::Error::custom)
    }
}
