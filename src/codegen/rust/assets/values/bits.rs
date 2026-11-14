//! PostgreSQL's bit strings.

use std::error::Error;
use std::fmt;

use bytes::{Buf, BufMut, BytesMut};
use postgres_types::{to_sql_checked, FromSql, IsNull, Kind, ToSql, Type};

type BoxError = Box<dyn Error + Sync + Send>;

/// A bit or bit varying value: its bits, first first.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Default)]
pub struct BitString(pub Vec<bool>);

impl BitString {
    /// Bits from text of 0 and 1.
    pub fn parse(text: &str) -> Option<Self> {
        text.chars()
            .map(|character| match character {
                '0' => Some(false),
                '1' => Some(true),
                _ => None,
            })
            .collect::<Option<Vec<bool>>>()
            .map(Self)
    }
}
impl fmt::Display for BitString {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        for bit in &self.0 {
            formatter.write_str(if *bit { "1" } else { "0" })?;
        }
        Ok(())
    }
}

fn bits(ty: &Type) -> bool {
    match ty.kind() {
        Kind::Domain(base) => bits(base),
        _ => *ty == Type::BIT || *ty == Type::VARBIT,
    }
}
impl<'a> FromSql<'a> for BitString {
    fn from_sql(_: &Type, mut raw: &'a [u8]) -> Result<Self, BoxError> {
        if raw.remaining() < 4 {
            return Err("invalid bit string".into());
        }
        let length = usize::try_from(raw.get_i32()).map_err(|_| "invalid bit string")?;
        if raw.remaining() != length.div_ceil(8) {
            return Err("invalid bit string".into());
        }
        Ok(Self((0..length).map(|index| raw[index / 8] & (0x80 >> (index % 8)) != 0).collect()))
    }
    fn accepts(ty: &Type) -> bool {
        bits(ty)
    }
}
impl ToSql for BitString {
    fn to_sql(&self, _: &Type, out: &mut BytesMut) -> Result<IsNull, BoxError> {
        out.put_i32(i32::try_from(self.0.len())?);
        for chunk in self.0.chunks(8) {
            out.put_u8(chunk.iter().enumerate().fold(0, |byte, (index, bit)| if *bit { byte | 0x80 >> index } else { byte }));
        }
        Ok(IsNull::No)
    }
    fn accepts(ty: &Type) -> bool {
        bits(ty)
    }
    to_sql_checked!();
}
