//! JSON documents, kept as the text written or read, and decoded on request.

use std::error::Error;
use std::marker::PhantomData;

use bytes::{BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};
use serde::de::DeserializeOwned;
use serde::Serialize;

type BoxError = Box<dyn Error + Sync + Send>;

/// A json or jsonb document: its text, decoded into `T` on request. SQL NULL is `None` around it;
/// a JSON null document is a document whose text is `null`.
pub struct Json<T = serde_json::Value> {
    text: String,
    value: PhantomData<fn() -> T>,
}

impl<T> Json<T> {
    /// A document from its text, which must be one JSON document.
    pub fn from_text(text: impl Into<String>) -> Result<Self, serde_json::Error> {
        let text = text.into();
        serde_json::from_str::<serde::de::IgnoredAny>(&text)?;
        Ok(Self { text, value: PhantomData })
    }
    /// The document's text, as written or as the server sent it.
    pub fn text(&self) -> &str {
        &self.text
    }
}
impl<T: Serialize> Json<T> {
    /// A document encoding a value.
    pub fn new(value: &T) -> Result<Self, serde_json::Error> {
        Ok(Self { text: serde_json::to_string(value)?, value: PhantomData })
    }
}
impl<T: DeserializeOwned> Json<T> {
    /// The document decoded, or why it does not decode.
    pub fn value(&self) -> Result<T, serde_json::Error> {
        serde_json::from_str(&self.text)
    }
}
impl<T> Clone for Json<T> {
    fn clone(&self) -> Self {
        Self { text: self.text.clone(), value: PhantomData }
    }
}
impl<T> PartialEq for Json<T> {
    fn eq(&self, other: &Self) -> bool {
        self.text == other.text
    }
}
impl<T> Eq for Json<T> {}
impl<T> std::fmt::Debug for Json<T> {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.debug_tuple("Json").field(&self.text).finish()
    }
}

fn json_base(ty: &Type) -> Option<&Type> {
    match ty.kind() {
        Kind::Domain(base) => json_base(base),
        _ if *ty == Type::JSON || *ty == Type::JSONB => Some(ty),
        _ => None,
    }
}

impl<'a, T> FromSql<'a> for Json<T> {
    fn from_sql(ty: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        let raw = match json_base(ty) {
            // jsonb's binary format is a version byte, then the text.
            Some(base) if *base == Type::JSONB => match raw.split_first() {
                Some((1, text)) => text,
                _ => return Err("unsupported jsonb version".into()),
            },
            _ => raw,
        };
        Ok(Self { text: std::str::from_utf8(raw)?.to_owned(), value: PhantomData })
    }
    fn accepts(ty: &Type) -> bool {
        json_base(ty).is_some()
    }
}
impl<T> ToSql for Json<T> {
    fn to_sql(&self, ty: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        if json_base(ty).is_some_and(|base| *base == Type::JSONB) {
            out.put_u8(1);
        }
        out.put_slice(self.text.as_bytes());
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        json_base(ty).is_some()
    }
    to_sql_checked!();
}
