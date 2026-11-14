//! PostgreSQL types whose value is their text: XML, jsonpath, text search vectors and queries,
//! and ACL items.

use std::error::Error;
use std::fmt;

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, Format, FromSql, IsNull, Kind, ToSql, Type};

use super::evaluator::{checkruntime as runtime, pg_catalog as operations};

type BoxError = Box<dyn Error + Sync + Send>;

fn named(ty: &Type, name: &str) -> bool {
    match ty.kind() {
        Kind::Domain(base) => named(base, name),
        _ => ty.schema() == "pg_catalog" && ty.name() == name,
    }
}
fn utf8(raw: &[u8]) -> Result<String, BoxError> {
    Ok(std::str::from_utf8(raw)?.to_owned())
}

macro_rules! text_value {
    ($type:ident, $doc:expr) => {
        #[doc = $doc]
        #[derive(Debug, Clone, PartialEq, Eq, Hash)]
        pub struct $type(pub String);
        impl fmt::Display for $type {
            fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
                formatter.write_str(&self.0)
            }
        }
    };
}
// A value sent as its text, which the server reads with the type's input function.
macro_rules! text_parameter {
    ($type:ident, $sql:expr) => {
        impl ToSql for $type {
            fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
                out.put_slice(self.0.as_bytes());
                Ok(IsNull::No)
            }
            fn accepts(ty: &Type) -> bool {
                named(ty, $sql)
            }
            fn encode_format(&self, _: &Type) -> Format {
                Format::Text
            }
            to_sql_checked!();
        }
    };
}

text_value!(Xml, "An XML document or content, as its text.");
text_value!(Jsonpath, "A jsonpath expression, as its text.");
text_value!(Tsvector, "A text search vector, as the server writes it.");
text_value!(Tsquery, "A text search query, as the server writes it.");
text_value!(Aclitem, "An access privilege item, as its text. The server has no binary output for it, so it can be written but not read.");

text_parameter!(Xml, "xml");
text_parameter!(Jsonpath, "jsonpath");
text_parameter!(Tsvector, "tsvector");
text_parameter!(Tsquery, "tsquery");
text_parameter!(Aclitem, "aclitem");

impl<'a> FromSql<'a> for Xml {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        Ok(Self(utf8(raw)?))
    }
    fn accepts(ty: &Type) -> bool {
        named(ty, "xml")
    }
}
// jsonpath's binary format is a version byte, then the text.
impl<'a> FromSql<'a> for Jsonpath {
    fn from_sql(_: &Type, raw: &'a [u8]) -> Result<Self, BoxError> {
        match raw.split_first() {
            Some((1, text)) => Ok(Self(utf8(text)?)),
            _ => Err("unsupported jsonpath version".into()),
        }
    }
    fn accepts(ty: &Type) -> bool {
        named(ty, "jsonpath")
    }
}
impl<'a> FromSql<'a> for Aclitem {
    fn from_sql(_: &Type, _: &'a [u8]) -> Result<Self, BoxError> {
        Err("aclitem has no binary format".into())
    }
    fn accepts(ty: &Type) -> bool {
        named(ty, "aclitem")
    }
}

fn cstring(raw: &mut &[u8]) -> Result<String, BoxError> {
    let end = raw.iter().position(|byte| *byte == 0).ok_or("unterminated text")?;
    let text = utf8(&raw[..end])?;
    raw.advance(end + 1);
    Ok(text)
}
fn text_result(value: runtime::TextValue) -> Result<String, BoxError> {
    match value {
        runtime::TextValue::Value(text) => Ok(text),
        _ => Err("the value has no text".into()),
    }
}

// A vector's lexemes, each with its positions, whose two high bits are the weight.
impl<'a> FromSql<'a> for Tsvector {
    fn from_sql(_: &Type, mut raw: &'a [u8]) -> Result<Self, BoxError> {
        if raw.remaining() < 4 {
            return Err("invalid tsvector".into());
        }
        let count = raw.get_i32();
        let mut lexemes = Vec::new();
        for _ in 0..count {
            let text = cstring(&mut raw)?;
            if raw.remaining() < 2 {
                return Err("invalid tsvector".into());
            }
            let positions = raw.get_u16();
            if raw.remaining() < usize::from(positions) * 2 {
                return Err("invalid tsvector".into());
            }
            let positions = (0..positions)
                .map(|_| {
                    let entry = raw.get_u16();
                    runtime::TsvectorPosition { position: i32::from(entry & 0x3fff), weight: i32::from(entry >> 14) }
                })
                .collect();
            lexemes.push(runtime::TsvectorLexeme { text, positions });
        }
        let value = runtime::TsvectorValue::Value(runtime::TsvectorPayload { lexemes, native_bytes: 0 });
        Ok(Self(text_result(operations::tsvector_to_text(value))?))
    }
    fn accepts(ty: &Type) -> bool {
        named(ty, "tsvector")
    }
}

// A query's items in prefix order, an operator followed by its right operand and then its left;
// NOT has one operand.
fn tsquery_node(raw: &mut &[u8], nodes: &mut Vec<runtime::TsqueryNode>) -> Result<usize, BoxError> {
    if raw.remaining() < 2 {
        return Err("invalid tsquery".into());
    }
    let index = nodes.len();
    match raw.get_u8() {
        1 => {
            if raw.remaining() < 2 {
                return Err("invalid tsquery".into());
            }
            let (weight, prefix) = (raw.get_u8(), raw.get_u8());
            let text = cstring(raw)?;
            nodes.push(runtime::TsqueryNode { kind: 0, text, weight: i32::from(weight), prefix: prefix != 0, distance: 0, left: 0, right: 0 });
        }
        2 => {
            let kind = raw.get_u8();
            let distance = if kind == 4 {
                if raw.remaining() < 2 {
                    return Err("invalid tsquery".into());
                }
                i32::from(raw.get_i16())
            } else {
                0
            };
            nodes.push(runtime::TsqueryNode { kind: i32::from(kind), text: String::new(), weight: 0, prefix: false, distance, left: 0, right: 0 });
            if kind == 1 {
                nodes[index].left = tsquery_node(raw, nodes)?;
            } else {
                nodes[index].right = tsquery_node(raw, nodes)?;
                nodes[index].left = tsquery_node(raw, nodes)?;
            }
        }
        _ => return Err("invalid tsquery item".into()),
    }
    Ok(index)
}
impl<'a> FromSql<'a> for Tsquery {
    fn from_sql(_: &Type, mut raw: &'a [u8]) -> Result<Self, BoxError> {
        if raw.remaining() < 4 {
            return Err("invalid tsquery".into());
        }
        let count = raw.get_i32();
        // An empty query, which the server writes as empty text.
        if count == 0 && raw.is_empty() {
            return Ok(Self(String::new()));
        }
        let mut nodes = Vec::new();
        if count > 0 {
            tsquery_node(&mut raw, &mut nodes)?;
        }
        if nodes.len() != usize::try_from(count).unwrap_or(usize::MAX) || !raw.is_empty() {
            return Err("invalid tsquery".into());
        }
        let value = runtime::TsqueryValue::Value(runtime::TsqueryPayload { nodes, root: 0, native_bytes: 0 });
        Ok(Self(text_result(operations::tsquery_to_text(value))?))
    }
    fn accepts(ty: &Type) -> bool {
        named(ty, "tsquery")
    }
}
